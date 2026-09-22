import {fetchWithAuth} from "@/lib/api";
import {
    API_ENDPOINTS,
    EXPORT_FILENAME_PREFIX,
    EXPORT_RATE_LIMIT_RETRY_DELAY_MS,
    EXPORT_SEARCH_MAX_LENGTH,
    MAX_IMPORT_DATA_ROWS,
} from "@/lib/constants";
import type {ImportResponseDTO} from "@/lib/api-types";
import {logger} from "@/lib/logger";

export interface ExportFilters {
    showArchived: boolean;
    search: string;
}

export interface ImportFailure {
    shortLink: string | null;
    destinationUrl: string | null;
    reason: string;
}

export interface ImportResult {
    imported: number;
    failed: ImportFailure[];
}

export type CsvPrecheckResult =
    | { readonly status: "ok"; readonly rowCount: number }
    | { readonly status: "empty" }
    | { readonly status: "too-many-rows"; readonly rowCount: number };

export class TransferError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "TransferError";
        this.status = status;
    }
}

const HTTP_TOO_MANY_REQUESTS = 429;
const PROBLEM_DETAIL_MAX_INLINE_LENGTH = 200;

export function isRateLimitedError(error: unknown): boolean {
    return error instanceof TransferError && error.status === HTTP_TOO_MANY_REQUESTS;
}

export function buildExportUrl(includeFilters: boolean, filters: ExportFilters): string {
    const params = new URLSearchParams();
    if (includeFilters) {
        params.set("showArchived", String(filters.showArchived));
        const search = filters.search.trim().slice(0, EXPORT_SEARCH_MAX_LENGTH);
        if (search) {
            params.set("search", search);
        }
    } else {
        params.set("showArchived", "false");
    }
    return `${API_ENDPOINTS.SHORTLINKS_EXPORT}?${params}`;
}

export function buildExportFilename(now: Date = new Date()): string {
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${EXPORT_FILENAME_PREFIX}-${year}-${month}-${day}.csv`;
}

export function countCsvDataRows(csvText: string): number {
    const nonBlankLines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return Math.max(0, nonBlankLines.length - 1);
}

export function precheckCsv(csvText: string): CsvPrecheckResult {
    const rowCount = countCsvDataRows(csvText);
    if (rowCount === 0) {
        return {status: "empty"};
    }
    if (rowCount > MAX_IMPORT_DATA_ROWS) {
        return {status: "too-many-rows", rowCount};
    }
    return {status: "ok", rowCount};
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function pickDetailField(record: Record<string, unknown>): string | null {
    for (const key of ["detail", "message", "title"]) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return null;
}

export function parseProblemDetail(bodyText: string, status: number): string {
    const fallback = `Request failed: ${status}`;
    const trimmed = bodyText.trim();
    if (!trimmed) {
        return fallback;
    }
    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (!isRecord(parsed)) {
            return fallback;
        }
        return pickDetailField(parsed) ?? fallback;
    } catch {
        return trimmed.length <= PROBLEM_DETAIL_MAX_INLINE_LENGTH ? trimmed : fallback;
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchExportCsv(url: string): Promise<Response> {
    return fetchWithAuth(url, {headers: {Accept: "text/csv"}});
}

async function fetchExportWithRetry(url: string): Promise<Response> {
    const first = await fetchExportCsv(url);
    if (first.status !== HTTP_TOO_MANY_REQUESTS) {
        return first;
    }
    await delay(EXPORT_RATE_LIMIT_RETRY_DELAY_MS);
    return fetchExportCsv(url);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    try {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function throwTransferError(res: Response, context: string): Promise<never> {
    const body = await res.text().catch(() => "");
    logger.error(context, undefined, {status: res.status});
    throw new TransferError(parseProblemDetail(body, res.status), res.status);
}

export async function downloadLinksExport(
    includeFilters: boolean,
    filters: ExportFilters,
): Promise<void> {
    const url = buildExportUrl(includeFilters, filters);
    let res: Response;
    try {
        res = await fetchExportWithRetry(url);
    } catch (error) {
        logger.error("Error downloading links export", error);
        throw error;
    }
    if (!res.ok) {
        await throwTransferError(res, "Links export request failed");
    }
    const blob = await res.blob();
    triggerBlobDownload(blob, buildExportFilename());
}

export function buildImportUrl(generateTakenKeys: boolean): string {
    if (!generateTakenKeys) {
        return API_ENDPOINTS.SHORTLINKS_IMPORT;
    }
    const params = new URLSearchParams();
    params.set("generateTakenKeys", "true");
    return `${API_ENDPOINTS.SHORTLINKS_IMPORT}?${params}`;
}

export interface UploadLinksImportOptions {
    generateTakenKeys?: boolean;
}

export async function uploadLinksImport(
    csvText: string,
    options: UploadLinksImportOptions = {},
): Promise<ImportResult> {
    let res: Response;
    try {
        res = await fetchWithAuth(buildImportUrl(options.generateTakenKeys ?? false), {
            method: "POST",
            headers: {
                "Content-Type": "text/csv;charset=UTF-8",
                Accept: "application/json",
            },
            body: csvText,
        });
    } catch (error) {
        logger.error("Error uploading links import", error);
        throw error;
    }
    if (!res.ok) {
        await throwTransferError(res, "Links import request failed");
    }
    const data: ImportResponseDTO = await res.json();
    return {imported: data.imported, failed: data.failed ?? []};
}
