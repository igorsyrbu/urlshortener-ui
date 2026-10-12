import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {
    parseImportProgress,
    reconnectDelayMs,
    subscribeToDiscoveredImport,
    type DiscoveredImportSubscription,
} from "@/lib/import-progress";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

function createDiscoveryOptions(): DiscoveredImportSubscription {
    return {signal: new AbortController().signal, onProgress: vi.fn(), onConnectionChange: vi.fn()};
}

function progressResponse(processedRows: number): Response {
    return new Response(`event: progress\ndata: ${JSON.stringify({processedRows, totalRows: 10})}\n\n`, {
        headers: {"Content-Type": "text/event-stream"},
    });
}

describe("discovered import subscription", () => {
    beforeEach(() => { vi.clearAllMocks(); });
    afterEach(() => { vi.useRealTimers(); });

    it("validates counters instead of accepting malformed progress", () => {
        expect(parseImportProgress('{"processedRows":3,"totalRows":10}')).toEqual({processedRows: 3, totalRows: 10});
        for (const processedRows of [-1, 11, 1.5, "3"]) {
            expect(() => parseImportProgress(JSON.stringify({processedRows, totalRows: 10}))).toThrow();
        }
        expect(() => parseImportProgress("null")).toThrow();
    });

    it("backs off exponentially and caps the delay at sixty seconds", () => {
        expect([0, 1, 2, 3, 4, 5, 6, 10].map(reconnectDelayMs)).toEqual(
            [2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000],
        );
    });

    it("establishes totals from the first snapshot and completes on the terminal event", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(10));
        const options = createDiscoveryOptions();
        await expect(subscribeToDiscoveredImport(options)).resolves.toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledWith(API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES,
            expect.objectContaining({cache: "no-store", headers: {Accept: "text/event-stream"}, signal: expect.any(AbortSignal)}));
        expect(options.onProgress).toHaveBeenCalledWith({processedRows: 10, totalRows: 10});
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("reports an empty stream without retrying when no job is ongoing", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null));
        const options = createDiscoveryOptions();
        await expect(subscribeToDiscoveredImport(options)).resolves.toBe("empty");
        expect(options.onProgress).not.toHaveBeenCalled();
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("reconnects after an interrupted stream without posting the CSV again", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(3)).mockResolvedValueOnce(progressResponse(10));
        const options = createDiscoveryOptions();
        const subscription = subscribeToDiscoveredImport(options);
        await vi.runAllTimersAsync();
        await expect(subscription).resolves.toBe("completed");
        expect(options.onConnectionChange).toHaveBeenCalledWith("reconnecting");
        expect(options.onProgress).toHaveBeenNthCalledWith(1, {processedRows: 3, totalRows: 10});
        expect(options.onProgress).toHaveBeenLastCalledWith({processedRows: 10, totalRows: 10});
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("keeps retrying internally well beyond the first failures", async () => {
        vi.useFakeTimers();
        for (let attempt = 0; attempt < 5; attempt++) {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        }
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(10));
        const subscription = subscribeToDiscoveredImport(createDiscoveryOptions());
        await vi.runAllTimersAsync();
        await expect(subscription).resolves.toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledTimes(6);
    });

    it("does not retry authorization failures indefinitely", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 401}));
        await expect(subscribeToDiscoveredImport(createDiscoveryOptions())).rejects.toMatchObject({status: 401});
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("stops reconnecting when the subscription is aborted", async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(3));
        const options = {...createDiscoveryOptions(), signal: controller.signal};
        const assertion = expect(subscribeToDiscoveredImport(options)).rejects.toBeDefined();
        await vi.advanceTimersByTimeAsync(0);
        controller.abort();
        await vi.runAllTimersAsync();
        await assertion;
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });
});
