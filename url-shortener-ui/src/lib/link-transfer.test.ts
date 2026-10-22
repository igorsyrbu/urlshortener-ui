import {afterEach, describe, expect, it, vi, type Mock} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {
    API_ENDPOINTS,
    EXPORT_FILENAME_PREFIX,
    EXPORT_RATE_LIMIT_RETRY_DELAY_MS,
    EXPORT_SEARCH_MAX_LENGTH,
    MAX_IMPORT_DATA_ROWS,
} from "@/lib/constants";
import {
    buildExportFilename,
    buildExportUrl,
    buildImportUrl,
    countCsvDataRows,
    downloadLinksExport,
    ExportFilters,
    isRateLimitedError,
    precheckCsv,
    TransferError,
    uploadLinksImport,
} from "@/lib/link-transfer";
import {logger} from "@/lib/logger";
import {ERROR_COPY} from "@/lib/errors";
import {createImportJob} from "@/test/import-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn()}}));

const HTTP_TOO_MANY_REQUESTS = 429;
const NO_FILTERS: ExportFilters = {showArchived: false, search: ""};

function csvWithRows(rowCount: number): string {
    return ["Destination URL", ...Array.from({length: rowCount}, (_, index) => `https://example.com/${index}`)].join("\n");
}

function queryOf(url: string): URLSearchParams {
    return new URL(url, "https://example.com").searchParams;
}

interface DownloadSpies {
    createObjectUrl: Mock;
    revokeObjectUrl: Mock;
    clickedDownloads: string[];
}

function spyOnBlobDownload(): DownloadSpies {
    const clickedDownloads: string[] = [];
    const createObjectUrl = vi.fn(() => "blob:export");
    const revokeObjectUrl = vi.fn();
    vi.stubGlobal("URL", class extends URL {
        static createObjectURL = createObjectUrl;
        static revokeObjectURL = revokeObjectUrl;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement): void {
        clickedDownloads.push(this.download);
    });
    return {createObjectUrl, revokeObjectUrl, clickedDownloads};
}

describe("TransferError", () => {
    it("carries the HTTP status and a recognizable name", () => {
        const error = new TransferError("Nope", 422);

        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({name: "TransferError", message: "Nope", status: 422});
    });

    it.each([
        [new TransferError("slow down", HTTP_TOO_MANY_REQUESTS), true],
        [new TransferError("boom", 500), false],
        [new Error("slow down"), false],
        [{status: HTTP_TOO_MANY_REQUESTS}, false],
        [null, false],
    ])("isRateLimitedError(%o) is %s", (error, expected) => {
        expect(isRateLimitedError(error)).toBe(expected);
    });
});

describe("buildExportUrl", () => {
    it("includes the archived flag and trimmed search when filters are requested", () => {
        const url = buildExportUrl(true, {showArchived: true, search: "  docs  "});

        expect(url.startsWith(API_ENDPOINTS.SHORTLINKS_EXPORT)).toBe(true);
        expect(Object.fromEntries(queryOf(url))).toEqual({showArchived: "true", search: "docs"});
    });

    it("omits a blank search", () => {
        const url = buildExportUrl(true, {showArchived: false, search: "   "});

        expect(Object.fromEntries(queryOf(url))).toEqual({showArchived: "false"});
    });

    it("truncates the search to the maximum length", () => {
        const url = buildExportUrl(true, {showArchived: false, search: "x".repeat(EXPORT_SEARCH_MAX_LENGTH + 50)});

        expect(queryOf(url).get("search")).toHaveLength(EXPORT_SEARCH_MAX_LENGTH);
    });

    it("exports everything except archived links when filters are not requested", () => {
        const url = buildExportUrl(false, {showArchived: true, search: "docs"});

        expect(Object.fromEntries(queryOf(url))).toEqual({showArchived: "false"});
    });

    it("encodes special characters in the search", () => {
        const url = buildExportUrl(true, {showArchived: false, search: "a&b=c"});

        expect(queryOf(url).get("search")).toBe("a&b=c");
    });
});

describe("buildExportFilename", () => {
    afterEach(() => { vi.useRealTimers(); });

    it.each([
        [new Date(2026, 0, 5), `${EXPORT_FILENAME_PREFIX}-2026-01-05.csv`],
        [new Date(2026, 11, 31), `${EXPORT_FILENAME_PREFIX}-2026-12-31.csv`],
    ])("zero-pads the local date of %s", (date, expected) => {
        expect(buildExportFilename(date)).toBe(expected);
    });

    it("defaults to the current date", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2027, 2, 9));

        expect(buildExportFilename()).toBe(`${EXPORT_FILENAME_PREFIX}-2027-03-09.csv`);
    });
});

describe("CSV precheck", () => {
    it.each([
        ["an empty file", "", 0],
        ["only a header", "Destination URL", 0],
        ["a header and blank lines", "Destination URL\n\n  \n", 0],
        ["a single row", "Destination URL\nhttps://example.com", 1],
        ["CRLF line endings", "Destination URL\r\nhttps://a.com\r\nhttps://b.com\r\n", 2],
        ["blank lines between rows", "Destination URL\n\nhttps://a.com\n\n\nhttps://b.com\n", 2],
    ])("counts data rows in %s", (_name, csv, expected) => {
        expect(countCsvDataRows(csv)).toBe(expected);
    });

    it.each([
        ["an empty file", ""],
        ["a header-only file", "Destination URL\n"],
    ])("reports %s as empty", (_name, csv) => {
        expect(precheckCsv(csv)).toEqual({status: "empty"});
    });

    it.each([1, MAX_IMPORT_DATA_ROWS])("accepts %i rows", (rowCount) => {
        expect(precheckCsv(csvWithRows(rowCount))).toEqual({status: "ok", rowCount});
    });

    it("rejects one row over the limit", () => {
        const rowCount = MAX_IMPORT_DATA_ROWS + 1;

        expect(precheckCsv(csvWithRows(rowCount))).toEqual({status: "too-many-rows", rowCount});
    });
});

describe("buildImportUrl", () => {
    it.each([
        [false, undefined, API_ENDPOINTS.SHORTLINKS_IMPORT],
        [false, "", API_ENDPOINTS.SHORTLINKS_IMPORT],
        [true, undefined, `${API_ENDPOINTS.SHORTLINKS_IMPORT}?generateTakenKeys=true`],
        [false, "links.csv", `${API_ENDPOINTS.SHORTLINKS_IMPORT}?fileName=links.csv`],
    ])("builds the URL for generateTakenKeys=%s and file name %j", (generateTakenKeys, fileName, expected) => {
        expect(buildImportUrl(generateTakenKeys, fileName)).toBe(expected);
    });

    it("encodes file names and combines both options", () => {
        const url = buildImportUrl(true, "links & notes.csv");

        expect(Object.fromEntries(queryOf(url))).toEqual({generateTakenKeys: "true", fileName: "links & notes.csv"});
    });
});

describe("downloadLinksExport", () => {
    afterEach(() => { vi.useRealTimers(); });

    it("requests CSV and downloads the response under a dated file name", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 5, 7));
        const downloads = spyOnBlobDownload();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("csv-body", {headers: {"Content-Type": "text/csv"}}));

        await downloadLinksExport(true, {showArchived: true, search: "docs"});

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(
            buildExportUrl(true, {showArchived: true, search: "docs"}),
            {headers: {Accept: "text/csv"}},
        );
        expect(downloads.clickedDownloads).toEqual([`${EXPORT_FILENAME_PREFIX}-2026-06-07.csv`]);
        expect(downloads.createObjectUrl).toHaveBeenCalledOnce();
        expect(downloads.revokeObjectUrl).toHaveBeenCalledExactlyOnceWith("blob:export");
        expect(document.querySelector("a[download]")).toBeNull();
    });

    it("retries once after the rate-limit delay", async () => {
        vi.useFakeTimers();
        const downloads = spyOnBlobDownload();
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(new Response(null, {status: HTTP_TOO_MANY_REQUESTS}))
            .mockResolvedValueOnce(new Response("csv-body"));

        const download = downloadLinksExport(false, NO_FILTERS);
        await vi.advanceTimersByTimeAsync(EXPORT_RATE_LIMIT_RETRY_DELAY_MS - 1);
        expect(fetchWithAuth).toHaveBeenCalledOnce();
        await vi.advanceTimersByTimeAsync(1);
        await download;

        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        expect(downloads.clickedDownloads).toHaveLength(1);
    });

    it("gives up with a rate-limit error when the retry is rate limited too", async () => {
        vi.useFakeTimers();
        const downloads = spyOnBlobDownload();
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json({detail: "Too many exports"}, {status: HTTP_TOO_MANY_REQUESTS}));

        const download = expect(downloadLinksExport(false, NO_FILTERS)).rejects.toSatisfy(isRateLimitedError);
        await vi.runAllTimersAsync();
        await download;

        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        expect(downloads.clickedDownloads).toEqual([]);
    });

    it("throws the problem detail and logs when the export fails", async () => {
        const downloads = spyOnBlobDownload();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "Export unavailable"}, {status: 503}));

        await expect(downloadLinksExport(false, NO_FILTERS)).rejects.toMatchObject({
            name: "TransferError", status: 503, message: "Export unavailable",
        });

        expect(logger.error).toHaveBeenCalledWith("Links export request failed", undefined, {status: 503});
        expect(downloads.clickedDownloads).toEqual([]);
    });

    it("falls back to the status when the error body cannot be read", async () => {
        const failedResponse = new Response(null, {status: 500});
        vi.spyOn(failedResponse, "text").mockRejectedValue(new Error("stream failed"));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(failedResponse);

        await expect(downloadLinksExport(false, NO_FILTERS)).rejects.toMatchObject({message: ERROR_COPY.SERVER});
    });

    it("logs and rethrows network failures", async () => {
        const networkError = new TypeError("Failed to fetch");
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(networkError);

        await expect(downloadLinksExport(false, NO_FILTERS)).rejects.toBe(networkError);

        expect(logger.error).toHaveBeenCalledWith("Error downloading links export", networkError);
    });

    it("revokes the object URL even when the download cannot be started", async () => {
        const downloads = spyOnBlobDownload();
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { throw new Error("blocked"); });
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("csv-body"));

        await expect(downloadLinksExport(false, NO_FILTERS)).rejects.toThrow("blocked");

        expect(downloads.revokeObjectUrl).toHaveBeenCalledOnce();
    });
});

describe("uploadLinksImport", () => {
    it("posts the raw CSV and returns the accepted job", async () => {
        const job = createImportJob();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(job));
        const controller = new AbortController();
        const csvText = "Destination URL\nhttps://example.com";

        const result = await uploadLinksImport(csvText, {fileName: "links.csv", signal: controller.signal});

        expect(result).toEqual(job);
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(`${API_ENDPOINTS.SHORTLINKS_IMPORT}?fileName=links.csv`, {
            method: "POST",
            body: csvText,
            signal: controller.signal,
            headers: {"Content-Type": "text/csv;charset=UTF-8", Accept: "application/json"},
        });
    });

    it("requests key generation for taken keys only when asked", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json(createImportJob()));

        await uploadLinksImport("csv");
        await uploadLinksImport("csv", {generateTakenKeys: true});

        expect(vi.mocked(fetchWithAuth).mock.calls.map(([url]) => url)).toEqual([
            API_ENDPOINTS.SHORTLINKS_IMPORT,
            `${API_ENDPOINTS.SHORTLINKS_IMPORT}?generateTakenKeys=true`,
        ]);
    });

    it("surfaces an ongoing-job rejection from the server", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "An import job is already ongoing for this user"}, {status: 422}));

        await expect(uploadLinksImport("csv")).rejects.toMatchObject({
            status: 422, message: "An import job is already ongoing for this user",
        });

        expect(logger.error).toHaveBeenCalledWith("Links import request failed", undefined, {status: 422});
    });

    it("logs and rethrows network failures", async () => {
        const abortError = new DOMException("Aborted", "AbortError");
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(abortError);

        await expect(uploadLinksImport("csv")).rejects.toBe(abortError);

        expect(logger.error).toHaveBeenCalledWith("Error uploading links import", abortError);
    });
});
