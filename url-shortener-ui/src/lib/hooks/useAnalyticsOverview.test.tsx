import type {ReactNode} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {type AnalyticsRange, presetAnalyticsRange} from "@/lib/analytics-api";
import {API_ENDPOINTS} from "@/lib/constants";
import {useAnalyticsOverview} from "@/lib/hooks/useAnalyticsOverview";
import {HTTP_INTERNAL_SERVER_ERROR} from "@/lib/http-status";
import {queryKeys} from "@/lib/query/query-keys";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const WEEK = presetAnalyticsRange("P7D");
const MONTH = presetAnalyticsRange("P30D");
const NEVER_ANSWERED = new Promise<Response>(() => undefined);

type TotalAnswer = number | Error | Promise<Response>;

/** Answers each period's total; the comparison and the time series answer empty. */
function answerTotals(totals: Partial<Record<string, TotalAnswer>>): void {
    vi.mocked(fetchWithAuth).mockImplementation(async (url) => {
        const period = new URLSearchParams(url.split("?")[1]).get("period");
        const answer = period && !url.includes("groupBy") ? totals[period] : undefined;
        if (answer instanceof Error) throw answer;
        if (answer instanceof Promise) return answer;
        if (typeof answer === "number") return Response.json(answer);
        return url.includes("groupBy") ? Response.json([]) : Response.json(0);
    });
}

function renderOverview(range: AnalyticsRange, queryClient: QueryClient = createTestQueryClient()) {
    const wrapper = ({children}: {children: ReactNode}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(({range: shownRange}) => useAnalyticsOverview(shownRange), {wrapper, initialProps: {range}});
}

function totalRequestsFor(period: string): number {
    return vi.mocked(fetchWithAuth).mock.calls.filter(([url]) => url === `${API_ENDPOINTS.ANALYTICS}?period=${period}`).length;
}

function signalOfTotal(period: string): AbortSignal | null | undefined {
    const call = vi.mocked(fetchWithAuth).mock.calls.find(([url]) => url === `${API_ENDPOINTS.ANALYTICS}?period=${period}`);
    return call?.[1]?.signal;
}

describe("useAnalyticsOverview", () => {
    it("has nothing to show and no failure while the first range loads", () => {
        answerTotals({P7D: NEVER_ANSWERED});

        const {result} = renderOverview(WEEK);

        expect(result.current).toMatchObject({overview: undefined, isRefreshing: false, hasLoadFailed: false, hasRefreshFailed: false});
    });

    it("loads the range's numbers", async () => {
        answerTotals({P7D: 42});

        const {result} = renderOverview(WEEK);

        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(42));
    });

    it("keeps the previous numbers on screen and reports refreshing while a new range loads", async () => {
        answerTotals({P7D: 42, P30D: NEVER_ANSWERED});
        const {result, rerender} = renderOverview(WEEK);
        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(42));

        rerender({range: MONTH});

        expect(result.current).toMatchObject({overview: {totalClicks: 42}, isRefreshing: true, hasRefreshFailed: false});
    });

    it("aborts the requests of a range the user moved away from", async () => {
        answerTotals({P7D: NEVER_ANSWERED, P30D: 30});
        const {result, rerender} = renderOverview(WEEK);

        rerender({range: MONTH});

        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(30));
        expect(signalOfTotal("P7D")?.aborted).toBe(true);
    });

    it("shows a range seen moments ago at once, without requesting it again", async () => {
        answerTotals({P7D: 42, P30D: 30});
        const {result, rerender} = renderOverview(WEEK);
        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(42));
        rerender({range: MONTH});
        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(30));

        rerender({range: WEEK});

        expect(result.current).toMatchObject({overview: {totalClicks: 42}, isRefreshing: false});
        expect(totalRequestsFor("P7D")).toBe(1);
    });

    it("keeps the previous numbers and reports the failure when a new range fails", async () => {
        answerTotals({P7D: 42, P30D: new Error("offline")});
        const {result, rerender} = renderOverview(WEEK);
        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(42));

        rerender({range: MONTH});

        await waitFor(() => expect(result.current.hasRefreshFailed).toBe(true));
        expect(result.current).toMatchObject({overview: {totalClicks: 42}, isRefreshing: false, hasLoadFailed: false});
    });

    it("reports a failed first load and loads the range again on retry", async () => {
        answerTotals({P7D: Promise.resolve(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}))});
        const {result} = renderOverview(WEEK);
        await waitFor(() => expect(result.current.hasLoadFailed).toBe(true));
        expect(result.current.overview).toBeUndefined();
        answerTotals({P7D: 42});

        act(() => result.current.retry());

        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(42));
        expect(result.current.hasLoadFailed).toBe(false);
    });

    it("keeps the numbers without reporting anything when a background refresh fails", async () => {
        answerTotals({P7D: 42});
        const queryClient = createTestQueryClient();
        const {result} = renderOverview(WEEK, queryClient);
        await waitFor(() => expect(result.current.overview?.totalClicks).toBe(42));
        answerTotals({P7D: new Error("offline")});

        await act(() => queryClient.refetchQueries({queryKey: queryKeys.analytics.overview(WEEK)}));

        expect(result.current).toMatchObject({overview: {totalClicks: 42}, hasRefreshFailed: false, hasLoadFailed: false});
    });
});
