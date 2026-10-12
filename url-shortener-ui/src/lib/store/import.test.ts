import {act, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {buildDiscoveredJob, IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {createImportJob} from "@/test/import-utils";

const mocks = vi.hoisted(() => ({refreshLinks: vi.fn(), refreshTags: vi.fn()}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/store/links", () => ({useLinkStore: {getState: () => ({fetchLinks: mocks.refreshLinks})}}));
vi.mock("@/lib/store/tags", () => ({useTagStoreWithoutCount: {getState: () => ({fetchTags: mocks.refreshTags})}}));

function progressChunk(processedRows: number, totalRows = 10): Uint8Array {
    return new TextEncoder().encode(`event: progress\ndata: ${JSON.stringify({processedRows, totalRows})}\n\n`);
}

function openStream(): {
    response: Response;
    send: (processedRows: number) => void;
    fail: (error: unknown) => void;
    close: () => void;
} {
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stream = new ReadableStream<Uint8Array>({start(controller): void { streamController = controller; }});
    const response = new Response(stream, {headers: {"Content-Type": "text/event-stream"}});
    return {
        response,
        send: (processedRows) => streamController?.enqueue(progressChunk(processedRows)),
        fail: (error) => streamController?.error(error),
        close: () => streamController?.close(),
    };
}

function mockUpdatesStream(stream: { response: Response; fail: (error: unknown) => void }): void {
    vi.mocked(fetchWithAuth).mockImplementationOnce(async (_endpoint, options) => {
        options?.signal?.addEventListener("abort", () => stream.fail(new DOMException("Aborted", "AbortError")), {once: true});
        return stream.response;
    });
}

describe("shared import tracker", () => {
    beforeEach(() => { vi.clearAllMocks(); resetImportTrackerForTests(); });
    afterEach(() => { vi.useRealTimers(); resetImportTrackerForTests(); });

    it("tracks a submission, ignores backwards snapshots, and refreshes once on completion", async () => {
        const stream = openStream();
        mockUpdatesStream(stream);
        act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
        await act(async () => { stream.send(5); });
        await waitFor(() => expect(useImportTracker.getState().progress?.processedRows).toBe(5));
        await act(async () => { stream.send(2); });
        expect(useImportTracker.getState().progress?.processedRows).toBe(5);
        await act(async () => { stream.send(10); });
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.COMPLETED));
        expect(mocks.refreshLinks).toHaveBeenCalledExactlyOnceWith(0);
        expect(mocks.refreshTags).toHaveBeenCalledOnce();
    });

    it("clears active toolbar state on an empty stream after a known job without claiming success", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));
        act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.COMPLETED));
        expect(useImportTracker.getState().progress).toEqual({processedRows: 0, totalRows: 10});
        expect(useImportTracker.getState().job?.status).not.toBe("COMPLETED");
        expect(mocks.refreshLinks).toHaveBeenCalledExactlyOnceWith(0);
        expect(mocks.refreshTags).toHaveBeenCalledOnce();
    });

    it("settles to idle without refreshing when discovery finds no ongoing import", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));
        act(() => { useImportTracker.getState().ensureDiscovery(); });
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.DISCOVERING);
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE));
        expect(useImportTracker.getState().progress).toBeNull();
        expect(mocks.refreshLinks).not.toHaveBeenCalled();
        expect(mocks.refreshTags).not.toHaveBeenCalled();
    });

    it("discovers an ongoing import without a retained POST response", async () => {
        const stream = openStream();
        mockUpdatesStream(stream);
        act(() => { useImportTracker.getState().ensureDiscovery(); });
        await act(async () => { stream.send(3); });
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE));
        expect(useImportTracker.getState().progress).toEqual({processedRows: 3, totalRows: 10});
        expect(useImportTracker.getState().job).toBeNull();
        expect(buildDiscoveredJob(useImportTracker.getState().progress ?? {processedRows: 0, totalRows: 0}).status).not.toBe("COMPLETED");
        await act(async () => { stream.send(10); });
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.COMPLETED));
        expect(mocks.refreshLinks).toHaveBeenCalledExactlyOnceWith(0);
    });

    it("reconnects internally with backoff instead of asking for a manual retry", async () => {
        vi.useFakeTimers();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(
            `event: progress\ndata: ${JSON.stringify({processedRows: 10, totalRows: 10})}\n\n`,
            {headers: {"Content-Type": "text/event-stream"}},
        ));
        act(() => { useImportTracker.getState().ensureDiscovery(); });
        await vi.runAllTimersAsync();
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.COMPLETED);
        expect(vi.mocked(fetchWithAuth).mock.calls.length).toBeGreaterThan(3);
        const postCalls = vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === "POST");
        expect(postCalls).toHaveLength(0);
        vi.useRealTimers();
        await waitFor(() => expect(mocks.refreshLinks).toHaveBeenCalledExactlyOnceWith(0));
    });

    it("keeps a single stream owner when a new submission replaces the previous one", async () => {
        const first = openStream();
        mockUpdatesStream(first);
        act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
        const firstSignal = vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal;
        const second = openStream();
        mockUpdatesStream(second);
        act(() => { useImportTracker.getState().trackSubmission({...createImportJob(), id: "job-2"}); });
        expect(firstSignal?.aborted).toBe(true);
        expect(useImportTracker.getState().job?.id).toBe("job-2");
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledTimes(2);
    });

    it("only resets from completed or idle so closing the modal never stops tracking", async () => {
        const stream = openStream();
        mockUpdatesStream(stream);
        act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
        act(() => { useImportTracker.getState().reset(); });
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
        await act(async () => { stream.send(10); });
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.COMPLETED));
        act(() => { useImportTracker.getState().reset(); });
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
        expect(useImportTracker.getState().progress).toBeNull();
    });

    it("stops the active stream when navigating away and rediscovers on return", async () => {
        const stream = openStream();
        mockUpdatesStream(stream);
        act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
        const signal = vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal;
        act(() => { useImportTracker.getState().stopTracking(); });
        expect(signal?.aborted).toBe(true);
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
        expect(useImportTracker.getState().progress).toBeNull();
        expect(useImportTracker.getState().job).toBeNull();
        const next = openStream();
        mockUpdatesStream(next);
        act(() => { useImportTracker.getState().ensureDiscovery(); });
        await act(async () => { next.send(4); });
        await waitFor(() => expect(useImportTracker.getState().progress?.processedRows).toBe(4));
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledTimes(2);
    });
});
