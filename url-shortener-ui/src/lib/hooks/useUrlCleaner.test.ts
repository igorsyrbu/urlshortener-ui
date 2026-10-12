import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import type {UrlCleanerResponse} from "@/lib/api-types";
import {API_ENDPOINTS, URL_CLEANER_DEBOUNCE_MS} from "@/lib/constants";
import {useUrlCleaner} from "@/lib/hooks/useUrlCleaner";
import {logger} from "@/lib/logger";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const DIRTY_URL = "https://example.com/page?utm_source=news";
const CLEAN_URL = "https://example.com/page";

function createCleanerResponse(overrides: Partial<UrlCleanerResponse> = {}): UrlCleanerResponse {
    return {url: CLEAN_URL, removedParams: ["utm_source"], completeProviderSkipped: false, ...overrides};
}

async function typeAndSettle(): Promise<void> {
    await act(async () => { await vi.advanceTimersByTimeAsync(URL_CLEANER_DEBOUNCE_MS); });
}

function renderCleaner(initialUrl: string, enabled = true): ReturnType<typeof renderHook<ReturnType<typeof useUrlCleaner>, {url: string; enabled: boolean}>> {
    return renderHook((props) => useUrlCleaner(props), {initialProps: {url: initialUrl, enabled}});
}

describe("useUrlCleaner", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("waits for the debounce before checking a url typed after mount", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        const {result, rerender} = renderCleaner("");

        rerender({url: DIRTY_URL, enabled: true});
        await act(async () => { await vi.advanceTimersByTimeAsync(URL_CLEANER_DEBOUNCE_MS - 1); });
        expect(fetchWithAuth).not.toHaveBeenCalled();
        expect(result.current.result).toBeNull();

        await act(async () => { await vi.advanceTimersByTimeAsync(1); });
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("checks a prefilled url right away", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));

        const {result} = renderCleaner(DIRTY_URL);
        await act(async () => { await Promise.resolve(); });

        expect(fetchWithAuth).toHaveBeenCalledOnce();
        expect(result.current.result).toEqual(createCleanerResponse());
    });

    it("posts the normalized url and exposes the cleaned suggestion", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        const {result} = renderCleaner(DIRTY_URL);

        await typeAndSettle();

        expect(result.current.result).toEqual(createCleanerResponse());
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.URL_CLEANER, expect.objectContaining({
            method: "POST",
            body: JSON.stringify({url: DIRTY_URL}),
        }));
    });

    it("prepends https to a bare domain before checking it", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        renderCleaner("example.com/page?utm_source=news");

        await typeAndSettle();

        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body).toBe(JSON.stringify({url: DIRTY_URL}));
    });

    it.each([
        ["blank input", "   "],
        ["text that is not a URL", "not a url"],
        ["a non-http scheme", "javascript:alert(1)"],
    ])("does not call the API for %s", async (_description, url) => {
        renderCleaner(url);

        await typeAndSettle();

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("does not call the API while disabled", async () => {
        const {result} = renderCleaner(DIRTY_URL, false);

        await typeAndSettle();

        expect(fetchWithAuth).not.toHaveBeenCalled();
        expect(result.current.result).toBeNull();
    });

    it("clears the suggestion when disabled afterwards", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        const {result, rerender} = renderCleaner(DIRTY_URL);
        await typeAndSettle();
        expect(result.current.result).not.toBeNull();

        rerender({url: DIRTY_URL, enabled: false});

        expect(result.current.result).toBeNull();
    });

    it("sends a single request for a burst of typing", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        const {rerender} = renderCleaner("");

        rerender({url: "https://example.com/p?utm_source=ab", enabled: true});
        await act(async () => { await vi.advanceTimersByTimeAsync(URL_CLEANER_DEBOUNCE_MS - 1); });
        rerender({url: DIRTY_URL, enabled: true});
        await typeAndSettle();

        expect(fetchWithAuth).toHaveBeenCalledOnce();
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body).toBe(JSON.stringify({url: DIRTY_URL}));
    });

    it("does not re-request a url that was already checked", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        const {rerender} = renderCleaner(DIRTY_URL);
        await typeAndSettle();

        rerender({url: `  ${DIRTY_URL}  `, enabled: true});
        await typeAndSettle();

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("hides the stale suggestion as soon as the url changes", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createCleanerResponse()));
        const {result, rerender} = renderCleaner(DIRTY_URL);
        await typeAndSettle();
        expect(result.current.result).not.toBeNull();

        rerender({url: "https://other.com/page?utm_source=news", enabled: true});

        expect(result.current.result).toBeNull();
    });

    it("aborts the in-flight request when the url changes", async () => {
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => undefined));
        const {rerender} = renderCleaner(DIRTY_URL);
        await typeAndSettle();
        const signal = vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal;

        rerender({url: "https://other.com/page?utm_source=news", enabled: true});
        await typeAndSettle();

        expect(signal?.aborted).toBe(true);
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("discards a response that arrives after the component unmounted", async () => {
        let respond: (response: Response) => void = () => undefined;
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>((resolve) => { respond = resolve; }));
        const {result, unmount} = renderCleaner(DIRTY_URL);
        await typeAndSettle();

        unmount();
        await act(async () => { respond(Response.json(createCleanerResponse())); });

        expect(result.current.result).toBeNull();
    });

    it.each([
        ["nothing was removed", createCleanerResponse({removedParams: []})],
        ["the provider was skipped entirely", createCleanerResponse({completeProviderSkipped: true})],
        ["the cleaned url equals the typed url", createCleanerResponse({url: DIRTY_URL})],
    ])("shows no suggestion when %s", async (_description, response) => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(response));
        const {result} = renderCleaner(DIRTY_URL);

        await typeAndSettle();

        expect(result.current.result).toBeNull();
    });

    it.each([
        ["unauthorized", 401],
        ["forbidden", 403],
        ["bad request", 400],
    ])("silently shows no suggestion for a %s response", async (_description, status) => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status}));
        const {result} = renderCleaner(DIRTY_URL);

        await typeAndSettle();

        expect(result.current.result).toBeNull();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("warns and shows no suggestion for a server error", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 500}));
        const {result} = renderCleaner(DIRTY_URL);

        await typeAndSettle();

        expect(result.current.result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith("URL cleaner check failed", {status: 500});
    });

    it("warns and shows no suggestion when the request rejects", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValue(new Error("offline"));
        const {result} = renderCleaner(DIRTY_URL);

        await typeAndSettle();

        expect(result.current.result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith("URL cleaner request error", {error: "Error: offline"});
    });
});
