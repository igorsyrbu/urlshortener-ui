import {afterEach, describe, expect, it, vi} from "vitest";
import {GET} from "@/app/api/shortlinks/import/updates/route";

const BACKEND_URL = "http://localhost:8080/shortlinks/import/updates";

function sseResponse(): Response {
    return new Response("event: progress\ndata: {\"processedRows\":1,\"totalRows\":10}\n\n", {
        status: 200,
        headers: {"Content-Type": "text/event-stream"},
    });
}

describe("import updates route", () => {
    afterEach(() => { vi.unstubAllGlobals(); });

    it("streams the backend body with anti-buffering headers", async () => {
        const backend = sseResponse();
        const fetchMock = vi.fn(async () => backend);
        vi.stubGlobal("fetch", fetchMock);
        const response = await GET(new Request("http://localhost:3000/api/shortlinks/import/updates", {
            headers: {Authorization: "Bearer token", Accept: "text/event-stream"},
        }));
        expect(fetchMock).toHaveBeenCalledWith(BACKEND_URL, expect.objectContaining({
            headers: {Authorization: "Bearer token", Accept: "text/event-stream"},
            cache: "no-store",
        }));
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/event-stream");
        expect(response.headers.get("Cache-Control")).toContain("no-cache");
        expect(response.headers.get("Cache-Control")).toContain("no-transform");
        expect(response.headers.get("X-Accel-Buffering")).toBe("no");
        // The stream must be forwarded, not buffered into memory.
        expect(response.body).toBe(backend.body);
        await response.body?.cancel();
    });

    it("forwards backend errors without streaming headers", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", {status: 401})));
        const response = await GET(new Request("http://localhost:3000/api/shortlinks/import/updates", {
            headers: {Authorization: "Bearer bad"},
        }));
        expect(response.status).toBe(401);
        await response.body?.cancel();
    });
});
