import type {ReactNode} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {type AnalyticsBreakdown, type AnalyticsRange, presetAnalyticsRange} from "@/lib/analytics-api";
import {API_ENDPOINTS} from "@/lib/constants";
import {useAnalyticsBreakdown, useAnalyticsReferrers, useAnalyticsTopLinks} from "@/lib/hooks/useAnalyticsSections";
import {HTTP_INTERNAL_SERVER_ERROR} from "@/lib/http-status";
import {mockAnalyticsApi} from "@/test/analytics-utils";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const WEEK = presetAnalyticsRange("P7D");
const MONTH = presetAnalyticsRange("P30D");
const NEVER_ANSWERED = new Promise<Response>(() => undefined);
const CANADA = [{label: "CA", clicks: 7}];

interface BreakdownProps {
    breakdown: AnalyticsBreakdown;
    range: AnalyticsRange;
}

function createWrapper() {
    const queryClient = createTestQueryClient();
    return function QueryWrapper({children}: {children: ReactNode}) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

function renderBreakdown(initialProps: BreakdownProps) {
    return renderHook(({breakdown, range}: BreakdownProps) => useAnalyticsBreakdown(breakdown, range), {wrapper: createWrapper(), initialProps});
}

function requestedUrls(): string[] {
    return vi.mocked(fetchWithAuth).mock.calls.map(([url]) => url);
}

describe("useAnalyticsBreakdown", () => {
    it("requests only the selected breakdown", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: Response.json(CANADA)});

        const {result} = renderBreakdown({breakdown: "country", range: WEEK});

        await waitFor(() => expect(result.current.rows).toEqual(CANADA));
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=country`]);
    });

    it("shows the loading state, not the other tab's rows, while a newly opened tab loads", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: Response.json(CANADA), continent: NEVER_ANSWERED});
        const {result, rerender} = renderBreakdown({breakdown: "country", range: WEEK});
        await waitFor(() => expect(result.current.rows).toEqual(CANADA));

        rerender({breakdown: "continent", range: WEEK});

        expect(result.current).toMatchObject({rows: [], isLoading: true});
    });

    it("keeps the breakdown's rows on screen while another period loads", async () => {
        const answers = {country: Response.json(CANADA)};
        mockAnalyticsApi(vi.mocked(fetchWithAuth), answers);
        const {result, rerender} = renderBreakdown({breakdown: "country", range: WEEK});
        await waitFor(() => expect(result.current.rows).toEqual(CANADA));
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: NEVER_ANSWERED});

        rerender({breakdown: "country", range: MONTH});

        expect(result.current).toMatchObject({rows: CANADA, isLoading: false});
    });

    it("reports a failure with nothing to show and loads again on retry", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR})});
        const {result} = renderBreakdown({breakdown: "country", range: WEEK});
        await waitFor(() => expect(result.current.hasFailed).toBe(true));
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: Response.json(CANADA)});

        act(() => result.current.retry());

        await waitFor(() => expect(result.current.rows).toEqual(CANADA));
        expect(result.current.hasFailed).toBe(false);
    });
});

describe("useAnalyticsTopLinks and useAnalyticsReferrers", () => {
    it("loads the top links of the range", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {top_link: Response.json([{shortLinkId: "link-1", clicks: 9}])});

        const {result} = renderHook(() => useAnalyticsTopLinks(WEEK), {wrapper: createWrapper()});

        await waitFor(() => expect(result.current.rows).toEqual([{shortLinkId: "link-1", clicks: 9}]));
    });

    it("reports failed referrers on their own", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {referrer: new Error("offline")});

        const {result} = renderHook(() => useAnalyticsReferrers(WEEK), {wrapper: createWrapper()});

        await waitFor(() => expect(result.current).toMatchObject({rows: [], isLoading: false, hasFailed: true}));
    });
});
