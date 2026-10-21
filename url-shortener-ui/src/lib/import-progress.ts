import {fetchWithAuth} from "@/lib/api";
import type {LinkImportProgressDTO} from "@/lib/api-types";
import {API_ENDPOINTS} from "@/lib/constants";
import {TransferError} from "@/lib/link-transfer";
import {parseProblemDetail} from "@/lib/problem-details";
import {readServerSentEvents, type ServerSentEvent} from "@/lib/server-sent-events";

export type ImportConnectionState = "processing" | "reconnecting";

export interface DiscoveredImportSubscription {
    signal: AbortSignal;
    onProgress: (progress: LinkImportProgressDTO) => void;
    onConnectionChange: (state: ImportConnectionState) => void;
}

export type DiscoveredImportResult = "completed" | "empty";

const RECONNECT_BASE_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const STREAM_TIMEOUT_MS = 315_000;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

export function parseImportProgress(data: string): LinkImportProgressDTO {
    const value: unknown = JSON.parse(data);
    if (typeof value !== "object" || value === null || !("processedRows" in value) || !("totalRows" in value)) {
        throw new Error("Invalid import progress event.");
    }
    const {processedRows, totalRows} = value;
    if (typeof processedRows !== "number" || typeof totalRows !== "number" ||
        !Number.isSafeInteger(processedRows) || !Number.isSafeInteger(totalRows) ||
        processedRows < 0 || totalRows < 0 || processedRows > totalRows) {
        throw new Error("Invalid import progress counters.");
    }
    return {processedRows, totalRows};
}

export function reconnectDelayMs(failedAttempt: number): number {
    return Math.min(MAX_RECONNECT_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, failedAttempt));
}

function waitToReconnect(signal: AbortSignal, delayMs: number): Promise<void> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
        const handleAbort = (): void => {
            clearTimeout(timer);
            reject(signal.reason);
        };
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", handleAbort);
            resolve();
        }, delayMs);
        signal.addEventListener("abort", handleAbort, {once: true});
    });
}

function isRetryableSubscriptionError(error: unknown): boolean {
    if (error instanceof TransferError) {
        return error.status >= HTTP_SERVER_ERROR || error.status === HTTP_TOO_MANY_REQUESTS;
    }
    return true;
}

async function fetchImportUpdates(signal: AbortSignal): Promise<Response> {    const response = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES, {
        headers: {Accept: "text/event-stream"}, cache: "no-store", signal,
    });
    if (!response.ok) {
        throw new TransferError(parseProblemDetail(await response.text(), response.status), response.status);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.startsWith("text/event-stream")) {
        await response.body?.cancel();
        throw new Error("Expected an import progress stream.");
    }
    return response;
}

type DiscoveredStreamOutcome = DiscoveredImportResult | "incomplete";

async function readDiscoveredImport(options: DiscoveredImportSubscription): Promise<DiscoveredStreamOutcome> {
    const signal = AbortSignal.any([options.signal, AbortSignal.timeout(STREAM_TIMEOUT_MS)]);
    const response = await fetchImportUpdates(signal);
    options.onConnectionChange("processing");
    let sawEvent = false;
    let establishedTotal: number | null = null;
    let hasCompleted = false;
    const handleEvent = (event: ServerSentEvent): boolean => {
        if (event.event !== "progress") return false;
        const progress = parseImportProgress(event.data);
        if (establishedTotal === null) {
            establishedTotal = progress.totalRows;
        } else if (progress.totalRows !== establishedTotal) {
            throw new Error("Import progress belongs to a different job.");
        }
        sawEvent = true;
        options.onProgress(progress);
        hasCompleted = progress.processedRows === progress.totalRows;
        return hasCompleted;
    };
    await readServerSentEvents(response, handleEvent);
    if (hasCompleted) return "completed";
    // No events means the backend has no ongoing job for this user.
    if (!sawEvent) return "empty";
    return "incomplete";
}

export async function subscribeToDiscoveredImport(options: DiscoveredImportSubscription): Promise<DiscoveredImportResult> {
    // Reconnect internally with exponential backoff until the stream reports a
    // terminal state, the backend confirms no ongoing import, or the caller aborts.
    let failedAttempt = 0;
    for (;;) {
        options.signal.throwIfAborted();
        try {
            const outcome = await readDiscoveredImport(options);
            if (outcome !== "incomplete") return outcome;
        } catch (error) {
            options.signal.throwIfAborted();
            if (!isRetryableSubscriptionError(error)) throw error;
        }
        options.onConnectionChange("reconnecting");
        await waitToReconnect(options.signal, reconnectDelayMs(failedAttempt));
        failedAttempt += 1;
    }
}
