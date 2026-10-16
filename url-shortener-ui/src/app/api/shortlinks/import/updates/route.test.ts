import {describe, expect, it, vi, type Mock} from "vitest";
import {GET} from "@/app/api/shortlinks/import/updates/route";
import {SERVER_API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";

const BACKEND_URL = `${SERVER_API_BASE_URL}${API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES}`;
const ROUTE_URL = "http://localhost:3000/api/shortlinks/import/updates";
const PROGRESS_EVENT = "event: progress\ndata: {\"processedRows\":1,\"totalRows\":10}\n\n";
const AUTHORIZED = {Authorization: "Bearer token"};
const HTTP_UNAUTHORIZED = 401;

function stubBackend(response: Response): Mock {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function sseResponse(): Response {
    return new Response(PROGRESS_EVENT, {status: 200, headers: {"Content-Type": "text/event-stream"}});
}

function requestWith(headers: Record<string, string> = AUTHORIZED, signal?: AbortSignal): Request {
    return new Request(ROUTE_URL, {headers, signal});
}

describe("import updates route", () => {
    it("asks the backend for an uncached event stream with the caller's credentials", async () => {
        const fetchMock = stubBackend(sseResponse());

        const response = await GET(requestWith({Authorization: "Bearer token"}));

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(BACKEND_URL, expect.objectContaining({
            headers: {Authorization: "Bearer token", Accept: "text/event-stream"},
            cache: "no-store",
        }));
        await response.body?.cancel();
    });

    it("streams the backend body with anti-buffering headers", async () => {
        const backend = sseResponse();
        stubBackend(backend);

        const response = await GET(requestWith());

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/event-stream");
        expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
        expect(response.headers.get("X-Accel-Buffering")).toBe("no");
        expect(response.body).toBe(backend.body);
        await response.body?.cancel();
    });

    it("delivers the backend events unchanged", async () => {
        stubBackend(sseResponse());

        const response = await GET(requestWith());

        expect(await response.text()).toBe(PROGRESS_EVENT);
    });

    it("stops the backend stream when the client disconnects", async () => {
        const fetchMock = stubBackend(sseResponse());
        const clientConnection = new AbortController();

        const response = await GET(requestWith(AUTHORIZED, clientConnection.signal));

        const forwardedSignal: AbortSignal = fetchMock.mock.calls[0][1].signal;
        expect(forwardedSignal.aborted).toBe(false);
        clientConnection.abort();
        expect(forwardedSignal.aborted).toBe(true);
        await response.body?.cancel();
    });

    it("forwards the backend status and message when the backend rejects the request", async () => {
        stubBackend(new Response("denied", {status: 401}));

        const response = await GET(requestWith({Authorization: "Bearer bad"}));

        expect(response.status).toBe(401);
        expect(await response.text()).toBe("denied");
    });

    it("does not mark an error response as an event stream", async () => {
        stubBackend(new Response("denied", {status: 403, headers: {"Content-Type": "application/json"}}));

        const response = await GET(requestWith());

        expect(response.headers.get("Content-Type")).toBe("application/json");
        await response.body?.cancel();
    });

    it("forwards the status of a successful backend answer without a body", async () => {
        stubBackend(new Response(null, {status: 204}));

        const response = await GET(requestWith());

        expect(response.status).toBe(204);
        expect(response.headers.get("X-Accel-Buffering")).toBeNull();
    });

    it("rejects a request without credentials and does not call the backend", async () => {
        const fetchMock = stubBackend(sseResponse());

        const response = await GET(requestWith({}));

        expect(response.status).toBe(HTTP_UNAUTHORIZED);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does not forward backend-only headers on an error response", async () => {
        stubBackend(new Response("boom", {
            status: 500,
            headers: {"Content-Type": "text/plain", "Set-Cookie": "session=secret", "X-Backend-Node": "node-7"},
        }));

        const response = await GET(requestWith());

        expect(response.status).toBe(500);
        expect(response.headers.get("Content-Type")).toBe("text/plain");
        expect(response.headers.get("Set-Cookie")).toBeNull();
        expect(response.headers.get("X-Backend-Node")).toBeNull();
        expect(await response.text()).toBe("boom");
    });

    it("propagates a backend connection failure", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connect ECONNREFUSED")));

        await expect(GET(requestWith())).rejects.toThrow("connect ECONNREFUSED");
    });
});
