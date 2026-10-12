import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {buildImportUrl, uploadLinksImport} from "@/lib/link-transfer";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

describe("import job submission", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("encodes file names and the key-generation option in query parameters", () => {
        const url = new URL(buildImportUrl(true, "links & notes.csv"), "https://example.com");
        expect(url.searchParams.get("fileName")).toBe("links & notes.csv");
        expect(url.searchParams.get("generateTakenKeys")).toBe("true");
        expect(buildImportUrl(false)).toBe(API_ENDPOINTS.SHORTLINKS_IMPORT);
    });

    it("returns the accepted job and still sends raw CSV", async () => {
        const job = {id: "job-1", status: "QUEUED", processedRows: 0, totalRows: 10};
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(job));
        const controller = new AbortController();
        const csvText = "Destination URL\nhttps://example.com";
        const result = await uploadLinksImport(csvText, {fileName: "links.csv", signal: controller.signal});
        expect(result).toEqual(job);
        expect(fetchWithAuth).toHaveBeenCalledWith(`${API_ENDPOINTS.SHORTLINKS_IMPORT}?fileName=links.csv`, {
            method: "POST", body: csvText, signal: controller.signal,
            headers: {"Content-Type": "text/csv;charset=UTF-8", Accept: "application/json"},
        });
    });

    it("surfaces an ongoing-job rejection from Spring", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "An import job is already ongoing for this user"}, {status: 422}));
        await expect(uploadLinksImport("csv")).rejects.toMatchObject({status: 422, message: "An import job is already ongoing for this user"});
    });
});
