import {create} from "zustand";
import type {LinkImportJobDTO, LinkImportProgressDTO} from "@/lib/api-types";
import {subscribeToDiscoveredImport} from "@/lib/import-progress";
import {logger} from "@/lib/logger";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";

export const IMPORT_TRACKING_STATUS = {
    IDLE: "idle",
    DISCOVERING: "discovering",
    ACTIVE: "active",
    RECONNECTING: "reconnecting",
    INTERRUPTED: "interrupted",
    COMPLETED: "completed",
} as const;

export type ImportTrackingStatus =
    (typeof IMPORT_TRACKING_STATUS)[keyof typeof IMPORT_TRACKING_STATUS];

interface ImportTrackerState {
    status: ImportTrackingStatus;
    progress: LinkImportProgressDTO | null;
    job: LinkImportJobDTO | null;
    trackSubmission: (job: LinkImportJobDTO) => void;
    ensureDiscovery: () => void;
    stopTracking: () => void;
    reset: () => void;
}

const DISCOVERED_JOB_ID = "discovered-import";

let activeController: AbortController | null = null;
let activeGeneration = 0;
let didRefreshCurrentRun = false;

export function buildDiscoveredJob(progress: LinkImportProgressDTO): LinkImportJobDTO {
    const timestamp = new Date().toISOString();
    return {
        id: DISCOVERED_JOB_ID,
        fileName: null,
        generateTakenKeys: false,
        processedRows: progress.processedRows,
        totalRows: progress.totalRows,
        succeededRows: 0,
        failedRows: 0,
        status: "QUEUED",
        createdTimestamp: timestamp,
        startedTimestamp: timestamp,
        completedTimestamp: null,
        expiresTimestamp: null,
    };
}

function isTrackingStatus(status: ImportTrackingStatus): boolean {
    return status === IMPORT_TRACKING_STATUS.DISCOVERING
        || status === IMPORT_TRACKING_STATUS.ACTIVE
        || status === IMPORT_TRACKING_STATUS.RECONNECTING;
}

function startRun(): { controller: AbortController; generation: number } {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    activeGeneration += 1;
    didRefreshCurrentRun = false;
    return {controller, generation: activeGeneration};
}

function stopRun(): void {
    activeController?.abort();
    activeController = null;
    activeGeneration += 1;
}

function refreshLinksAndTagsOnce(): void {
    if (didRefreshCurrentRun) return;
    didRefreshCurrentRun = true;
    void useLinkStore.getState().fetchLinks(0);
    void useTagStoreWithoutCount.getState().fetchTags();
}

function applyTrackedProgress(progress: LinkImportProgressDTO): void {
    const current = useImportTracker.getState().progress;
    if (current && progress.processedRows < current.processedRows) return;
    useImportTracker.setState({progress});
}

function completeTrackedRun(): void {
    useImportTracker.setState({status: IMPORT_TRACKING_STATUS.COMPLETED});
    refreshLinksAndTagsOnce();
}

function interruptTrackedRun(error: unknown): void {
    logger.warn("Import progress subscription interrupted", {error: error instanceof Error ? error.message : String(error)});
    if (isTrackingStatus(useImportTracker.getState().status)) {
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.INTERRUPTED});
    }
}

function watchSharedUpdates(controller: AbortController, generation: number, hadPriorProgress: boolean): void {
    let sawEvent = hadPriorProgress;
    void subscribeToDiscoveredImport({
        signal: controller.signal,
        onProgress: (progress) => {
            if (generation !== activeGeneration) return;
            sawEvent = true;
            applyTrackedProgress(progress);
            const {status} = useImportTracker.getState();
            if (status === IMPORT_TRACKING_STATUS.DISCOVERING || status === IMPORT_TRACKING_STATUS.RECONNECTING) {
                useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE});
            }
        },
        onConnectionChange: (state) => {
            if (generation !== activeGeneration) return;
            const {status} = useImportTracker.getState();
            if (!isTrackingStatus(status)) return;
            if (state === "reconnecting") {
                useImportTracker.setState({status: IMPORT_TRACKING_STATUS.RECONNECTING});
            } else if (status === IMPORT_TRACKING_STATUS.RECONNECTING) {
                useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE});
            }
        },
    }).then((result) => {
        if (generation !== activeGeneration || controller.signal.aborted) return;
        if (result === "completed" || sawEvent) {
            // A terminal event, or an empty stream after a known job: the backend
            // confirms no ongoing import. Clear active state and refresh once without
            // claiming per-row success, since SSE only exposes processed/total counts.
            completeTrackedRun();
            return;
        }
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.IDLE, progress: null});
    }).catch((error: unknown) => {
        if (generation !== activeGeneration || controller.signal.aborted) return;
        interruptTrackedRun(error);
    });
}

export const useImportTracker = create<ImportTrackerState>((set, get) => ({
    status: IMPORT_TRACKING_STATUS.IDLE,
    progress: null,
    job: null,

    trackSubmission: (job) => {
        stopRun();
        didRefreshCurrentRun = false;
        if (job.status === "COMPLETED") {
            set({status: IMPORT_TRACKING_STATUS.COMPLETED, progress: {processedRows: job.processedRows, totalRows: job.totalRows}, job});
            refreshLinksAndTagsOnce();
            return;
        }
        const {controller, generation} = startRun();
        set({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: {processedRows: job.processedRows, totalRows: job.totalRows}, job});
        watchSharedUpdates(controller, generation, true);
    },

    ensureDiscovery: () => {
        const {status} = get();
        if (status === IMPORT_TRACKING_STATUS.DISCOVERING
            || status === IMPORT_TRACKING_STATUS.ACTIVE
            || status === IMPORT_TRACKING_STATUS.RECONNECTING
            || status === IMPORT_TRACKING_STATUS.COMPLETED) return;
        const hadPrior = get().progress !== null || get().job !== null;
        const {controller, generation} = startRun();
        set({status: IMPORT_TRACKING_STATUS.DISCOVERING});
        watchSharedUpdates(controller, generation, hadPrior);
    },

    stopTracking: () => {
        stopRun();
        didRefreshCurrentRun = false;
        set({status: IMPORT_TRACKING_STATUS.IDLE, progress: null, job: null});
    },

    reset: () => {
        const {status} = get();
        // Closing the modal mid-import must not stop toolbar tracking.
        if (status !== IMPORT_TRACKING_STATUS.COMPLETED && status !== IMPORT_TRACKING_STATUS.IDLE) return;
        stopRun();
        didRefreshCurrentRun = false;
        set({status: IMPORT_TRACKING_STATUS.IDLE, progress: null, job: null});
    },
}));

export function resetImportTrackerForTests(): void {
    stopRun();
    didRefreshCurrentRun = false;
    useImportTracker.setState({status: IMPORT_TRACKING_STATUS.IDLE, progress: null, job: null});
}
