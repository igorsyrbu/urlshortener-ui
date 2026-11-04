import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {
    DiscoveredImportSubscription,
    parseImportProgress,
    reconnectDelayMs,
    STREAM_IDLE_TIMEOUT_MS,
    subscribeToDiscoveredImport,
} from "@/lib/import-progress";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const TOTAL_ROWS = 10;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const SSE_HEADERS = {"Content-Type": "text/event-stream"};

function createDiscoveryOptions(signal: AbortSignal = new AbortController().signal): DiscoveredImportSubscription {
    return {signal, onProgress: vi.fn(), onConnectionChange: vi.fn()};
}

function progressEvent(processedRows: number, totalRows = TOTAL_ROWS, eventName = "progress"): string {
    return `event: ${eventName}\ndata: ${JSON.stringify({processedRows, totalRows})}\n\n`;
}

function progressResponse(processedRows: number, totalRows = TOTAL_ROWS): Response {
    return new Response(progressEvent(processedRows, totalRows), {headers: SSE_HEADERS});
}

const encoder = new TextEncoder();

/** A stream the test writes to; it fails like a real fetch body when the request's signal aborts. */
function openStreamResponse(signal: AbortSignal | null | undefined): {response: Response; send: (text: string) => void} {
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({start(controller): void { streamController = controller; }});
    signal?.addEventListener("abort", () => streamController?.error(new DOMException("Aborted", "AbortError")), {once: true});
    return {
        response: new Response(body, {headers: SSE_HEADERS}),
        send: (text) => streamController?.enqueue(encoder.encode(text)),
    };
}

async function settle<T>(promise: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return promise;
}

describe("parseImportProgress", () => {
    it.each([
        [3, TOTAL_ROWS],
        [0, TOTAL_ROWS],
        [TOTAL_ROWS, TOTAL_ROWS],
        [0, 0],
    ])("accepts %i of %i rows", (processedRows, totalRows) => {
        expect(parseImportProgress(JSON.stringify({processedRows, totalRows}))).toEqual({processedRows, totalRows});
    });

    it.each([
        ["negative processed rows", {processedRows: -1, totalRows: TOTAL_ROWS}],
        ["negative total rows", {processedRows: 0, totalRows: -1}],
        ["more processed than total rows", {processedRows: TOTAL_ROWS + 1, totalRows: TOTAL_ROWS}],
        ["fractional counters", {processedRows: 1.5, totalRows: TOTAL_ROWS}],
        ["string counters", {processedRows: "3", totalRows: TOTAL_ROWS}],
        ["counters beyond the safe integer range", {processedRows: 1, totalRows: 2 ** 60}],
        ["missing processed rows", {totalRows: TOTAL_ROWS}],
        ["missing total rows", {processedRows: 1}],
    ])("rejects %s", (_name, payload) => {
        expect(() => parseImportProgress(JSON.stringify(payload))).toThrow();
    });

    it.each(["null", "42", '"text"', "[]", "not json"])("rejects the payload %s", (payload) => {
        expect(() => parseImportProgress(payload)).toThrow();
    });
});

describe("reconnectDelayMs", () => {
    it("backs off exponentially from two seconds and caps the delay at sixty seconds", () => {
        const delays = [0, 1, 2, 3, 4, 5, 6, 10].map(reconnectDelayMs);

        expect(delays).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
    });

    it("treats a negative attempt as the first one", () => {
        expect(reconnectDelayMs(-3)).toBe(reconnectDelayMs(0));
    });
});

describe("subscribeToDiscoveredImport", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("requests the update stream without caching", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const options = createDiscoveryOptions();

        await subscribeToDiscoveredImport(options);

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES, {
            headers: {Accept: "text/event-stream"},
            cache: "no-store",
            signal: expect.any(AbortSignal),
        });
    });

    it("reports progress and completes on the terminal event", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const options = createDiscoveryOptions();

        const result = await subscribeToDiscoveredImport(options);

        expect(result).toBe("completed");
        expect(options.onConnectionChange).toHaveBeenCalledWith("processing");
        expect(options.onProgress).toHaveBeenCalledExactlyOnceWith({processedRows: TOTAL_ROWS, totalRows: TOTAL_ROWS});
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("ignores events that are not progress events", async () => {
        const body = `${progressEvent(1, TOTAL_ROWS, "heartbeat")}${progressEvent(TOTAL_ROWS)}`;
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(body, {headers: SSE_HEADERS}));
        const options = createDiscoveryOptions();

        await subscribeToDiscoveredImport(options);

        expect(options.onProgress).toHaveBeenCalledExactlyOnceWith({processedRows: TOTAL_ROWS, totalRows: TOTAL_ROWS});
    });

    it("reports an empty stream without retrying when no job is ongoing", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null));
        const options = createDiscoveryOptions();

        const result = await subscribeToDiscoveredImport(options);

        expect(result).toBe("empty");
        expect(options.onProgress).not.toHaveBeenCalled();
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("reconnects after an interrupted stream without posting the CSV again", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(3)).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const options = createDiscoveryOptions();

        const result = await settle(subscribeToDiscoveredImport(options));

        expect(result).toBe("completed");
        expect(options.onConnectionChange).toHaveBeenCalledWith("reconnecting");
        expect(options.onProgress).toHaveBeenNthCalledWith(1, {processedRows: 3, totalRows: TOTAL_ROWS});
        expect(options.onProgress).toHaveBeenLastCalledWith({processedRows: TOTAL_ROWS, totalRows: TOTAL_ROWS});
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("waits the backoff delay before reconnecting", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(3)).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const subscription = subscribeToDiscoveredImport(createDiscoveryOptions());

        await vi.advanceTimersByTimeAsync(reconnectDelayMs(0) - 1);
        expect(fetchWithAuth).toHaveBeenCalledOnce();
        await vi.advanceTimersByTimeAsync(1);

        await expect(subscription).resolves.toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it.each([
        ["server errors", new Response(null, {status: HTTP_SERVER_ERROR})],
        ["rate limiting", new Response(null, {status: HTTP_TOO_MANY_REQUESTS})],
        ["an unexpected content type", new Response("{}", {headers: {"Content-Type": "application/json"}})],
    ])("keeps retrying after %s", async (_name, failure) => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(failure).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));

        const result = await settle(subscribeToDiscoveredImport(createDiscoveryOptions()));

        expect(result).toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("keeps retrying after network failures", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));

        const result = await settle(subscribeToDiscoveredImport(createDiscoveryOptions()));

        expect(result).toBe("completed");
    });

    it("keeps retrying internally well beyond the first failures", async () => {
        vi.useFakeTimers();
        for (let attempt = 0; attempt < 5; attempt++) {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_SERVER_ERROR}));
        }
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));

        const result = await settle(subscribeToDiscoveredImport(createDiscoveryOptions()));

        expect(result).toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledTimes(6);
    });

    it("starts again at the shortest delay after a stream that delivered progress", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(new Response(null, {status: HTTP_SERVER_ERROR}))
            .mockResolvedValueOnce(new Response(null, {status: HTTP_SERVER_ERROR}))
            .mockResolvedValueOnce(progressResponse(3))
            .mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const subscription = subscribeToDiscoveredImport(createDiscoveryOptions());
        await vi.advanceTimersByTimeAsync(reconnectDelayMs(0) + reconnectDelayMs(1));
        expect(fetchWithAuth).toHaveBeenCalledTimes(3);

        await vi.advanceTimersByTimeAsync(reconnectDelayMs(0));

        expect(fetchWithAuth).toHaveBeenCalledTimes(4);
        await expect(subscription).resolves.toBe("completed");
    });

    it("reconnects when an open stream stays silent for the idle timeout", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth)
            .mockImplementationOnce(async (_endpoint, options) => openStreamResponse(options?.signal).response)
            .mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const options = createDiscoveryOptions();
        const subscription = subscribeToDiscoveredImport(options);

        await vi.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS - 1);
        expect(options.onConnectionChange).not.toHaveBeenCalledWith("reconnecting");
        await vi.advanceTimersByTimeAsync(1 + reconnectDelayMs(0));

        await expect(subscription).resolves.toBe("completed");
        expect(options.onConnectionChange).toHaveBeenCalledWith("reconnecting");
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("keeps a slow stream open as long as bytes keep arriving, comments included", async () => {
        vi.useFakeTimers();
        let send: (text: string) => void = () => undefined;
        vi.mocked(fetchWithAuth).mockImplementationOnce(async (_endpoint, options) => {
            const stream = openStreamResponse(options?.signal);
            send = stream.send;
            return stream.response;
        });
        const subscription = subscribeToDiscoveredImport(createDiscoveryOptions());

        for (let tick = 0; tick < 3; tick++) {
            await vi.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS - 1);
            send(": keepalive\n\n");
        }
        send(progressEvent(TOTAL_ROWS));

        await expect(subscription).resolves.toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("gives up on a connection that never answers within the idle timeout and tries again", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth)
            .mockImplementationOnce((_endpoint, options) => new Promise<Response>((_resolve, reject) => {
                options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {once: true});
            }))
            .mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const subscription = subscribeToDiscoveredImport(createDiscoveryOptions());

        await vi.advanceTimersByTimeAsync(STREAM_IDLE_TIMEOUT_MS + reconnectDelayMs(0));

        await expect(subscription).resolves.toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("reconnects when the stream switches to a different job", async () => {
        vi.useFakeTimers();
        const mixedJobs = new Response(`${progressEvent(3, TOTAL_ROWS)}${progressEvent(4, TOTAL_ROWS + 5)}`, {headers: SSE_HEADERS});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(mixedJobs).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));
        const options = createDiscoveryOptions();

        const result = await settle(subscribeToDiscoveredImport(options));

        expect(result).toBe("completed");
        expect(options.onProgress).not.toHaveBeenCalledWith({processedRows: 4, totalRows: TOTAL_ROWS + 5});
    });

    it("reconnects when a progress event is malformed", async () => {
        vi.useFakeTimers();
        const malformed = new Response("event: progress\ndata: {broken\n\n", {headers: SSE_HEADERS});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(malformed).mockResolvedValueOnce(progressResponse(TOTAL_ROWS));

        const result = await settle(subscribeToDiscoveredImport(createDiscoveryOptions()));

        expect(result).toBe("completed");
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it.each([
        [401, "an authorization failure"],
        [403, "a forbidden response"],
        [404, "a missing endpoint"],
    ])("fails on status %i (%s) instead of retrying", async (status) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "denied"}, {status}));

        await expect(subscribeToDiscoveredImport(createDiscoveryOptions())).rejects.toMatchObject({status, message: "denied"});

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("stops reconnecting when the subscription is aborted", async () => {
        vi.useFakeTimers();
        const controller = new AbortController();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(progressResponse(3));
        const assertion = expect(subscribeToDiscoveredImport(createDiscoveryOptions(controller.signal))).rejects.toBeDefined();
        await vi.advanceTimersByTimeAsync(0);

        controller.abort();
        await vi.runAllTimersAsync();

        await assertion;
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("does not start when the signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(subscribeToDiscoveredImport(createDiscoveryOptions(controller.signal))).rejects.toBeDefined();

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("rethrows an abort that interrupts a request instead of retrying it", async () => {
        const controller = new AbortController();
        vi.mocked(fetchWithAuth).mockImplementationOnce(async () => {
            controller.abort();
            throw new DOMException("Aborted", "AbortError");
        });

        await expect(subscribeToDiscoveredImport(createDiscoveryOptions(controller.signal))).rejects.toBeDefined();

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });
});
