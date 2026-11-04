import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {
    customAnalyticsRange,
    fetchAnalyticsBreakdown,
    fetchAnalyticsOverview,
    fetchAnalyticsReferrers,
    fetchAnalyticsTopLinks,
    presetAnalyticsRange,
} from "@/lib/analytics-api";
import {ApiError} from "@/lib/api-request";
import {API_ENDPOINTS} from "@/lib/constants";
import {formatLocalIsoDate} from "@/lib/date-utils";
import {HTTP_INTERNAL_SERVER_ERROR} from "@/lib/http-status";
import {logger} from "@/lib/logger";
import {mockAnalyticsApi} from "@/test/analytics-utils";
import {createLinkItem} from "@/test/link-utils";
import {FAR_FROM_UTC_TIME_ZONES} from "@/test/time-zone-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const NOW = new Date("2026-10-12T10:00:00Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEK = presetAnalyticsRange("P7D");
const TIME_SERIES = [{date: "2026-10-11", clicks: 5}];

function requestedUrls(): string[] {
    return vi.mocked(fetchWithAuth).mock.calls.map(([url]) => url);
}

function serverError(): Response {
    return new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR});
}

function aSignal(): AbortSignal {
    return new AbortController().signal;
}

describe("fetchAnalyticsOverview", () => {
    beforeEach(() => {
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("loads the total, the previous period and the clicks per day", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: Response.json(42), previous: Response.json(30), date: Response.json(TIME_SERIES)});

        const overview = await fetchAnalyticsOverview(WEEK, aSignal());

        expect(overview).toEqual({totalClicks: 42, previousTotalClicks: 30, timeSeries: TIME_SERIES});
        expect(requestedUrls()).toEqual(expect.arrayContaining([
            `${API_ENDPOINTS.ANALYTICS}?period=P7D`,
            `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=date`,
        ]));
    });

    it("compares against the preceding period of the same length", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth));

        await fetchAnalyticsOverview(presetAnalyticsRange("P30D"), aSignal());

        const previousEnd = new Date(NOW.getTime() - 30 * MS_PER_DAY);
        const previousStart = new Date(NOW.getTime() - 60 * MS_PER_DAY);
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${formatLocalIsoDate(previousStart)}&end=${formatLocalIsoDate(previousEnd)}`);
    });

    it("queries the picked days and skips the comparison for a custom range", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth));

        const overview = await fetchAnalyticsOverview(customAnalyticsRange(new Date(2026, 8, 1), new Date(2026, 8, 15)), aSignal());

        expect(requestedUrls().sort()).toEqual([
            `${API_ENDPOINTS.ANALYTICS}?start=2026-09-01&end=2026-09-15`,
            `${API_ENDPOINTS.ANALYTICS}?start=2026-09-01&end=2026-09-15&groupBy=date`,
        ]);
        expect(overview.previousTotalClicks).toBeNull();
    });

    it.each([
        ["the total fails with an HTTP error", {total: serverError()}],
        ["the total is not a number", {total: Response.json({clicks: 3})}],
        ["the time series fails", {date: serverError()}],
        ["the time series request is offline", {date: new Error("offline")}],
    ])("rejects instead of returning empty data when %s", async (_name, routes) => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), routes);

        await expect(fetchAnalyticsOverview(WEEK, aSignal())).rejects.toThrow();
    });

    it("rejects with the HTTP status so a server error can be retried", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: serverError()});

        await expect(fetchAnalyticsOverview(WEEK, aSignal())).rejects.toBeInstanceOf(ApiError);
    });

    it("hides the comparison and logs instead of failing when the previous period fails", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: Response.json(42), previous: serverError()});

        const overview = await fetchAnalyticsOverview(WEEK, aSignal());

        expect(overview).toMatchObject({totalClicks: 42, previousTotalClicks: null});
        expect(logger.error).toHaveBeenCalledWith("Previous total clicks fetch error", expect.any(Error));
    });

    it("passes the signal to every request", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth));
        const signal = aSignal();

        await fetchAnalyticsOverview(WEEK, signal);

        expect(vi.mocked(fetchWithAuth).mock.calls.map(([, options]) => options?.signal)).toEqual([signal, signal, signal]);
    });
});

describe("analytics breakdowns", () => {
    it.each(["country", "continent", "device", "os"] as const)("requests the %s breakdown for the range", async (breakdown) => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {[breakdown]: Response.json([{label: "A", clicks: 1}])});

        const rows = await fetchAnalyticsBreakdown(WEEK, breakdown, aSignal());

        expect(rows).toEqual([{label: "A", clicks: 1}]);
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=${breakdown}`]);
    });

    it("requests the referrers for the range", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {referrer: Response.json([{label: "google.com", clicks: 3}])});

        const rows = await fetchAnalyticsReferrers(WEEK, aSignal());

        expect(rows).toEqual([{label: "google.com", clicks: 3}]);
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=referrer`]);
    });

    it("rejects a payload that is not a list", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: Response.json({rows: []})});

        await expect(fetchAnalyticsBreakdown(WEEK, "country", aSignal())).rejects.toThrow("Unexpected analytics response");
    });
});

describe("fetchAnalyticsTopLinks", () => {
    it("adds each link's details by id", async () => {
        const details = createLinkItem({id: "link-1"});
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {
            top_link: Response.json([{shortLinkId: "link-1", clicks: 9}, {shortLinkId: "link-2", clicks: 4}]),
            byIds: Response.json([details]),
        });

        const topLinks = await fetchAnalyticsTopLinks(WEEK, aSignal());

        expect(topLinks).toEqual([{shortLinkId: "link-1", clicks: 9, details}, {shortLinkId: "link-2", clicks: 4, details: undefined}]);
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.SHORTLINKS_BY_IDS}?ids=link-1,link-2`);
    });

    it("does not request details when there are no top links", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {top_link: Response.json([])});

        const topLinks = await fetchAnalyticsTopLinks(WEEK, aSignal());

        expect(topLinks).toEqual([]);
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=top_link`]);
    });

    it.each([
        ["fails", serverError()],
        ["is offline", new Error("offline")],
    ])("returns the top links without details and logs when the details request %s", async (_name, byIds) => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {top_link: Response.json([{shortLinkId: "link-1", clicks: 9}]), byIds});

        const topLinks = await fetchAnalyticsTopLinks(WEEK, aSignal());

        expect(topLinks).toEqual([{shortLinkId: "link-1", clicks: 9}]);
        expect(logger.error).toHaveBeenCalledWith("Top Links details fetch error", expect.any(Error));
    });

    it("rejects instead of returning links without details when it was aborted", async () => {
        const controller = new AbortController();
        vi.mocked(fetchWithAuth).mockImplementation(async (url) => {
            if (url.startsWith(API_ENDPOINTS.SHORTLINKS_BY_IDS)) {
                controller.abort();
                throw new DOMException("Aborted", "AbortError");
            }
            return Response.json([{shortLinkId: "link-1", clicks: 9}]);
        });

        await expect(fetchAnalyticsTopLinks(WEEK, controller.signal)).rejects.toThrow("Aborted");
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("rejects when the top links request fails", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {top_link: serverError()});

        await expect(fetchAnalyticsTopLinks(WEEK, aSignal())).rejects.toBeInstanceOf(ApiError);
    });
});

describe.each([
    {timeZone: FAR_FROM_UTC_TIME_ZONES[0], previousStart: "2026-09-29", previousEnd: "2026-10-06"},
    {timeZone: FAR_FROM_UTC_TIME_ZONES[1], previousStart: "2026-09-28", previousEnd: "2026-10-05"},
])("analytics dates in $timeZone", ({timeZone, previousStart, previousEnd}) => {
    beforeEach(() => {
        vi.stubEnv("TZ", timeZone);
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("keeps the picked local calendar days for a custom range", () => {
        expect(customAnalyticsRange(new Date(2026, 8, 1), new Date(2026, 8, 15))).toEqual({start: "2026-09-01", end: "2026-09-15"});
    });

    it("computes the comparison window from the local date of today", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth));

        await fetchAnalyticsOverview(WEEK, aSignal());

        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${previousStart}&end=${previousEnd}`);
    });
});
