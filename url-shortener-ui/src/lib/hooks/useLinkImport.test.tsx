import type {ReactNode} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook as renderHookBare, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {toast} from "sonner";
import {API_ENDPOINTS, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_FILE_MEGABYTES, ROUTES} from "@/lib/constants";
import {buildFileTooLargeMessage} from "@/components/links/import-export-constants";
import {IMPORT_SESSION_STATE, useLinkImport} from "@/lib/hooks/useLinkImport";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {setActiveQueryClient} from "@/lib/query/active-query-client";
import {queryKeys} from "@/lib/query/query-keys";
import {createCsvFile} from "@/test/csv-utils";
import {createImportJob} from "@/test/import-utils";
import {createTestQueryClient} from "@/test/query-utils";

const mocks = vi.hoisted(() => ({push: vi.fn()}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("sonner", () => ({toast: {error: vi.fn(), success: vi.fn()}}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: mocks.push})}));

let queryClient = createTestQueryClient();
let invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

function renderHook<Result>(callback: () => Result): ReturnType<typeof renderHookBare<Result, unknown>> {
    const wrapper = ({children}: {children: ReactNode}): ReactNode => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHookBare(callback, {wrapper});
}

beforeEach(() => {
    queryClient = createTestQueryClient();
    invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    setActiveQueryClient(queryClient);
});
afterEach(() => { setActiveQueryClient(null); });

function expectLinksAndTagsRefreshedOnce(): void {
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.links.all});
    expect(invalidateQueries).toHaveBeenCalledWith({queryKey: queryKeys.tags.all});
}

function sendProgress(controller: ReadableStreamDefaultController<Uint8Array>, processedRows: number): void {
    controller.enqueue(new TextEncoder().encode(`event: progress\ndata: ${JSON.stringify({processedRows, totalRows: 10})}\n\n`));
}

function mockAcceptedJob(): ReadableStreamDefaultController<Uint8Array> {
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stream = new ReadableStream<Uint8Array>({start(controller): void { streamController = controller; }});
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createImportJob()));
    vi.mocked(fetchWithAuth).mockImplementationOnce(async (_endpoint, options) => {
        options?.signal?.addEventListener("abort", () => { streamController?.error(new DOMException("Aborted", "AbortError")); }, {once: true});
        return new Response(stream, {headers: {"Content-Type": "text/event-stream"}});
    });
    if (!streamController) throw new Error("Stream controller was not initialized");
    return streamController;
}

describe("file size guard", () => {
    beforeEach(() => { resetImportTrackerForTests(); });

    it("rejects a file above the size cap without reading or uploading it", async () => {
        const file = createCsvFile();
        Object.defineProperty(file, "size", {value: MAX_IMPORT_FILE_BYTES + 1});
        const readText = vi.spyOn(file, "text");
        const {result} = renderHook(() => useLinkImport());

        await act(async () => { await result.current.handleImport(file, false); });

        expect(toast.error).toHaveBeenCalledWith(buildFileTooLargeMessage(MAX_IMPORT_FILE_MEGABYTES));
        expect(readText).not.toHaveBeenCalled();
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });
});

describe("import session lifecycle", () => {
    beforeEach(() => { resetImportTrackerForTests(); });
    afterEach(() => { resetImportTrackerForTests(); });

    it("shows progress, completes on the final event, and refreshes links and tags once", async () => {
        const controller = mockAcceptedJob();
        const {result} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        await act(async () => { sendProgress(controller, 3); });
        await waitFor(() => expect(result.current.session?.progress.processedRows).toBe(3));
        expect(result.current.session?.state).toBe(IMPORT_SESSION_STATE.PROCESSING);
        expect(invalidateQueries).not.toHaveBeenCalled();
        await act(async () => { sendProgress(controller, 10); });
        await waitFor(() => expect(result.current.session?.state).toBe(IMPORT_SESSION_STATE.COMPLETED));
        expectLinksAndTagsRefreshedOnce();
    });

    it("ignores older progress snapshots instead of moving the bar backwards", async () => {
        const controller = mockAcceptedJob();
        const {result, unmount} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        await act(async () => { sendProgress(controller, 5); });
        await waitFor(() => expect(result.current.session?.progress.processedRows).toBe(5));
        await act(async () => { sendProgress(controller, 2); });
        expect(result.current.session?.progress.processedRows).toBe(5);
        unmount();
    });

    it("prevents duplicate submissions while a job is active", async () => {
        mockAcceptedJob();
        const {result, unmount} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        expect(vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
        unmount();
    });

    it("keeps toolbar tracking active when the modal closes instead of aborting", async () => {
        const controller = mockAcceptedJob();
        const {result, unmount} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        const signal = vi.mocked(fetchWithAuth).mock.calls[1][1]?.signal;
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
        unmount();
        expect(signal?.aborted).toBe(false);
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
        expect(useImportTracker.getState().job?.id).toBe("job-1");
        await act(async () => { sendProgress(controller, 10); });
        await waitFor(() => expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.COMPLETED));
        expectLinksAndTagsRefreshedOnce();
    });

    it("skips SSE if the POST already returned a completed job", async () => {
        const job = {...createImportJob(), status: "COMPLETED", processedRows: 10, succeededRows: 8, failedRows: 2};
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(job));
        const {result} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        expect(result.current.session?.state).toBe(IMPORT_SESSION_STATE.COMPLETED);
        expect(fetchWithAuth).toHaveBeenCalledOnce();
        expectLinksAndTagsRefreshedOnce();
    });

    it("reconnects internally after a transient failure without resubmitting the CSV", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createImportJob()));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response('event: progress\ndata: {"processedRows":10,"totalRows":10}\n\n', {
            headers: {"Content-Type": "text/event-stream"},
        }));
        const {result} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        await waitFor(() => expect(result.current.session?.state).toBe(IMPORT_SESSION_STATE.COMPLETED), {timeout: 10000});
        expect(vi.mocked(fetchWithAuth).mock.calls.filter(([endpoint]) => endpoint.startsWith(`${API_ENDPOINTS.SHORTLINKS_IMPORT}?`))).toHaveLength(1);
        expect(fetchWithAuth).toHaveBeenCalledTimes(3);
        expectLinksAndTagsRefreshedOnce();
    });

    it("surfaces an interrupted state without retrying authorization failures", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createImportJob())).mockResolvedValueOnce(new Response(null, {status: 401}));
        const {result} = renderHook(() => useLinkImport());
        await act(async () => { await result.current.handleImport(createCsvFile(), false); });
        await waitFor(() => expect(result.current.session?.state).toBe(IMPORT_SESSION_STATE.INTERRUPTED));
        expect(invalidateQueries).not.toHaveBeenCalled();
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });
});

describe("refreshing after an import", () => {
    it("returns to the links list and refreshes links and tags", () => {
        const {result} = renderHook(() => useLinkImport());

        act(() => { result.current.handleRefreshLinks(); });

        expect(mocks.push).toHaveBeenCalledWith(ROUTES.LINKS, {scroll: false});
        expectLinksAndTagsRefreshedOnce();
    });
});
