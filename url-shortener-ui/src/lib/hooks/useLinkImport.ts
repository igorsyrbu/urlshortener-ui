"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import type {LinkImportJobDTO, LinkImportProgressDTO} from "@/lib/api-types";
import {MAX_IMPORT_DATA_ROWS, ROUTES} from "@/lib/constants";
import {precheckCsv, TransferError, uploadLinksImport} from "@/lib/link-transfer";
import {logger} from "@/lib/logger";
import {buildDiscoveredJob, IMPORT_TRACKING_STATUS, useImportTracker, type ImportTrackingStatus} from "@/lib/store/import";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {
    buildTooManyRowsMessage, IMPORT_EMPTY_FILE_MESSAGE, IMPORT_FAILED_MESSAGE,
} from "@/components/links/import-export-constants";

export const IMPORT_SESSION_STATE = {
    PROCESSING: "processing",
    RECONNECTING: "reconnecting",
    INTERRUPTED: "interrupted",
    COMPLETED: "completed",
} as const;

export type ImportSessionState =
    (typeof IMPORT_SESSION_STATE)[keyof typeof IMPORT_SESSION_STATE];

export interface ImportSession {
    job: LinkImportJobDTO;
    progress: LinkImportProgressDTO;
    state: ImportSessionState;
}

interface UseLinkImportResult {
    session: ImportSession | null;
    isUploading: boolean;
    handleImport: (file: File, generateTakenKeys: boolean) => Promise<void>;
    handleReset: () => void;
    handleRefreshLinks: () => void;
}

async function readImportFile(file: File): Promise<string> {
    const csvText = await file.text();
    const precheck = precheckCsv(csvText);
    if (precheck.status === "empty") throw new Error(IMPORT_EMPTY_FILE_MESSAGE);
    if (precheck.status === "too-many-rows") throw new Error(buildTooManyRowsMessage(MAX_IMPORT_DATA_ROWS));
    return csvText;
}

function mapTrackingToSession(
    status: ImportTrackingStatus,
    job: LinkImportJobDTO | null,
    progress: LinkImportProgressDTO | null,
): ImportSession | null {
    if (!progress) return null;
    const resolvedJob = job ?? buildDiscoveredJob(progress);
    switch (status) {
        case IMPORT_TRACKING_STATUS.ACTIVE:
        case IMPORT_TRACKING_STATUS.DISCOVERING:
            return {job: resolvedJob, progress, state: IMPORT_SESSION_STATE.PROCESSING};
        case IMPORT_TRACKING_STATUS.RECONNECTING:
            return {job: resolvedJob, progress, state: IMPORT_SESSION_STATE.RECONNECTING};
        case IMPORT_TRACKING_STATUS.INTERRUPTED:
            return {job: resolvedJob, progress, state: IMPORT_SESSION_STATE.INTERRUPTED};
        case IMPORT_TRACKING_STATUS.COMPLETED:
            return {job: resolvedJob, progress, state: IMPORT_SESSION_STATE.COMPLETED};
        case IMPORT_TRACKING_STATUS.IDLE:
            return null;
    }
}

export function useLinkImport(): UseLinkImportResult {
    const router = useRouter();
    const status = useImportTracker((state) => state.status);
    const job = useImportTracker((state) => state.job);
    const progress = useImportTracker((state) => state.progress);
    const [isUploading, setIsUploading] = useState(false);
    const uploadController = useRef<AbortController | null>(null);

    useEffect(() => () => uploadController.current?.abort(), []);

    const session = mapTrackingToSession(status, job, progress);

    const handleImport = async (file: File, generateTakenKeys: boolean): Promise<void> => {
        if (uploadController.current) return;
        if (useImportTracker.getState().status !== IMPORT_TRACKING_STATUS.IDLE) return;
        const controller = new AbortController();
        uploadController.current = controller;
        setIsUploading(true);
        try {
            const csvText = await readImportFile(file);
            controller.signal.throwIfAborted();
            const submittedJob = await uploadLinksImport(csvText, {generateTakenKeys, fileName: file.name, signal: controller.signal});
            if (controller.signal.aborted) return;
            useImportTracker.getState().trackSubmission(submittedJob);
        } catch (error) {
            if (controller.signal.aborted) return;
            if (!(error instanceof TransferError)) logger.error("Error starting links import", error);
            toast.error(error instanceof Error ? error.message : IMPORT_FAILED_MESSAGE);
        } finally {
            uploadController.current = null;
            if (!controller.signal.aborted) setIsUploading(false);
        }
    };

    const handleReset = (): void => {
        useImportTracker.getState().reset();
    };

    const handleRefreshLinks = (): void => {
        router.push(ROUTES.LINKS, {scroll: false});
        void useLinkStore.getState().fetchLinks(0);
        void useTagStoreWithoutCount.getState().fetchTags();
    };

    return {session, isUploading, handleImport, handleReset, handleRefreshLinks};
}
