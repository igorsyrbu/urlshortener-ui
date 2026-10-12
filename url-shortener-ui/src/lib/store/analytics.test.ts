import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useAnalyticsStore} from "@/lib/store/analytics";
import {createLinkItem} from "@/test/link-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const initialState = useAnalyticsStore.getInitialState();
const NOW = new Date("2026-10-12T10:00:00Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type RouteKey = "total" | "previous" | "date" | "referrer" | "top_link" | "country" | "continent" | "device" | "os" | "byIds";
type Routes = Partial<Record<RouteKey, Response | Error>>;

const DEFAULT_ROUTES: Record<RouteKey, Response> = {
    total: Response.json(0),
    previous: Response.json(0),
    date: Response.json([]),
    referrer: Response.json([]),
    top_link: Response.json([]),
    country: Response.json([]),
    continent: Response.json([]),
    device: Response.json([]),
    os: Response.json([]),
    byIds: Response.json([]),
};

function routeKeyFor(url: string): RouteKey {
    if (url.startsWith(API_ENDPOINTS.SHORTLINKS_BY_IDS)) return "byIds";
    const params = new URLSearchParams(url.split("?")[1]);
    const groupBy = params.get("groupBy");
    if (groupBy) return groupBy as RouteKey;
    return params.has("period") ? "total" : "previous";
}

function mockAnalyticsApi(routes: Routes = {}): void {
    vi.mocked(fetchWithAuth).mockImplementation(async (url) => {
        const route = routes[routeKeyFor(url)] ?? DEFAULT_ROUTES[routeKeyFor(url)];
        if (route instanceof Error) throw route;
        return route.clone();
    });
}

function requestedUrls(): string[] {
    return vi.mocked(fetchWithAuth).mock.calls.map(([url]) => url);
}

function isoDay(date: Date): string {
    return date.toISOString().split("T")[0];
}

async function settleRequests(): Promise<void> {
    await vi.waitFor(() => expect(useAnalyticsStore.getState().isLocationLoading).toBe(false));
    await vi.waitFor(() => expect(useAnalyticsStore.getState().isDeviceLoading).toBe(false));
}

describe("analytics store fetching", () => {
    beforeEach(() => {
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        useAnalyticsStore.setState(initialState, true);
    });

    it("starts in a loading state that has not fetched anything", () => {
        expect(useAnalyticsStore.getState().loading).toBe(true);
        expect(useAnalyticsStore.getState().hasFetched).toBe(false);
        expect(useAnalyticsStore.getState().period).toBe("P7D");
    });

    it("loads every analytics section for the default period", async () => {
        mockAnalyticsApi({
            total: Response.json(42),
            previous: Response.json(30),
            date: Response.json([{date: "2026-10-11", clicks: 5}]),
            referrer: Response.json([{label: "google.com", clicks: 3}]),
            country: Response.json([{label: "Canada", clicks: 7}]),
            device: Response.json([{label: "Mobile", clicks: 9}]),
        });

        useAnalyticsStore.getState().fetchAnalytics();
        await vi.waitFor(() => expect(useAnalyticsStore.getState().loading).toBe(false));
        await settleRequests();

        const state = useAnalyticsStore.getState();
        expect(state.totalClicks).toBe(42);
        expect(state.timeSeries).toEqual([{date: "2026-10-11", clicks: 5}]);
        expect(state.referrers).toEqual([{label: "google.com", clicks: 3}]);
        expect(state.countries).toEqual([{label: "Canada", clicks: 7}]);
        expect(state.devices).toEqual([{label: "Mobile", clicks: 9}]);
        await vi.waitFor(() => expect(useAnalyticsStore.getState().previousTotalClicks).toBe(30));
    });

    it("queries each breakdown for the selected period", async () => {
        mockAnalyticsApi();

        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();

        const base = `${API_ENDPOINTS.ANALYTICS}?period=P7D`;
        expect(requestedUrls()).toEqual(expect.arrayContaining([
            base,
            `${base}&groupBy=date`,
            `${base}&groupBy=referrer`,
            `${base}&groupBy=top_link`,
            `${base}&groupBy=country`,
            `${base}&groupBy=device`,
        ]));
    });

    it("compares against the preceding period of the same length", async () => {
        mockAnalyticsApi();
        useAnalyticsStore.setState({period: "P7D"});

        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();

        const periodEnd = new Date(NOW.getTime() - 7 * MS_PER_DAY);
        const periodStart = new Date(NOW.getTime() - 14 * MS_PER_DAY);
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${isoDay(periodStart)}&end=${isoDay(periodEnd)}`);
    });

    it("does not fetch again once data has been fetched unless forced", async () => {
        mockAnalyticsApi();
        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();
        const callsAfterFirstFetch = vi.mocked(fetchWithAuth).mock.calls.length;

        useAnalyticsStore.getState().fetchAnalytics();
        expect(fetchWithAuth).toHaveBeenCalledTimes(callsAfterFirstFetch);

        useAnalyticsStore.getState().fetchAnalytics(true);
        await settleRequests();
        expect(vi.mocked(fetchWithAuth).mock.calls.length).toBeGreaterThan(callsAfterFirstFetch);
    });

    it("marks sections as loading while requests are pending", () => {
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => undefined));

        useAnalyticsStore.getState().fetchAnalytics();

        expect(useAnalyticsStore.getState().loading).toBe(true);
        expect(useAnalyticsStore.getState().isLocationLoading).toBe(true);
        expect(useAnalyticsStore.getState().isDeviceLoading).toBe(true);
        expect(useAnalyticsStore.getState().hasFetched).toBe(true);
    });

    it("falls back to empty lists when breakdown requests fail with an HTTP error", async () => {
        const failure = () => new Response(null, {status: 500});
        mockAnalyticsApi({date: failure(), referrer: failure(), country: failure(), device: failure()});
        useAnalyticsStore.setState({timeSeries: [{date: "2026-10-01", clicks: 1}]});

        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();

        await vi.waitFor(() => expect(useAnalyticsStore.getState().timeSeries).toEqual([]));
        expect(useAnalyticsStore.getState().referrers).toEqual([]);
        expect(useAnalyticsStore.getState().countries).toEqual([]);
        expect(useAnalyticsStore.getState().devices).toEqual([]);
    });

    it("keeps the previous total when the comparison request fails", async () => {
        mockAnalyticsApi({previous: new Response(null, {status: 500})});
        useAnalyticsStore.setState({previousTotalClicks: 12});

        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();

        expect(useAnalyticsStore.getState().previousTotalClicks).toBe(12);
    });

    it("logs network failures and stops the location and device spinners", async () => {
        mockAnalyticsApi({country: new Error("offline"), device: new Error("offline"), date: new Error("offline")});

        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();

        expect(useAnalyticsStore.getState().isLocationLoading).toBe(false);
        expect(useAnalyticsStore.getState().isDeviceLoading).toBe(false);
        expect(logger.error).toHaveBeenCalledWith("countries fetch error", expect.any(Error));
        expect(logger.error).toHaveBeenCalledWith("devices fetch error", expect.any(Error));
        expect(logger.error).toHaveBeenCalledWith("Time series fetch error", expect.any(Error));
    });
});

describe("analytics store top links", () => {
    afterEach(() => {
        useAnalyticsStore.setState(initialState, true);
    });

    it("enriches top links with link details by id", async () => {
        const details = createLinkItem({id: "link-1"});
        mockAnalyticsApi({
            top_link: Response.json([{shortLinkId: "link-1", clicks: 9}, {shortLinkId: "link-2", clicks: 4}]),
            byIds: Response.json([details]),
        });

        useAnalyticsStore.getState().fetchAnalytics();

        await vi.waitFor(() => expect(useAnalyticsStore.getState().topLinks).toHaveLength(2));
        expect(useAnalyticsStore.getState().topLinks[0]).toEqual({shortLinkId: "link-1", clicks: 9, details});
        expect(useAnalyticsStore.getState().topLinks[1].details).toBeUndefined();
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.SHORTLINKS_BY_IDS}?ids=link-1,link-2`);
    });

    it("does not request details when there are no top links", async () => {
        mockAnalyticsApi({top_link: Response.json([])});

        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();

        expect(requestedUrls().some((url) => url.startsWith(API_ENDPOINTS.SHORTLINKS_BY_IDS))).toBe(false);
        expect(useAnalyticsStore.getState().topLinks).toEqual([]);
    });

    it("shows top links without details when the details request fails", async () => {
        mockAnalyticsApi({
            top_link: Response.json([{shortLinkId: "link-1", clicks: 9}]),
            byIds: new Response(null, {status: 500}),
        });

        useAnalyticsStore.getState().fetchAnalytics();

        await vi.waitFor(() => expect(useAnalyticsStore.getState().topLinks).toEqual([{shortLinkId: "link-1", clicks: 9}]));
    });

    it("shows top links without details and logs when the details request rejects", async () => {
        mockAnalyticsApi({
            top_link: Response.json([{shortLinkId: "link-1", clicks: 9}]),
            byIds: new Error("offline"),
        });

        useAnalyticsStore.getState().fetchAnalytics();

        await vi.waitFor(() => expect(useAnalyticsStore.getState().topLinks).toEqual([{shortLinkId: "link-1", clicks: 9}]));
        expect(logger.error).toHaveBeenCalledWith("Top Links details fetch error", expect.any(Error));
    });

    it("shows no top links when the top links request fails", async () => {
        mockAnalyticsApi({top_link: new Response(null, {status: 500})});
        useAnalyticsStore.setState({topLinks: [{shortLinkId: "old", clicks: 1}]});

        useAnalyticsStore.getState().fetchAnalytics();

        await vi.waitFor(() => expect(useAnalyticsStore.getState().topLinks).toEqual([]));
    });

    it("logs when the top links request rejects", async () => {
        mockAnalyticsApi({top_link: new Error("offline")});

        useAnalyticsStore.getState().fetchAnalytics();

        await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith("Top Links fetch error", expect.any(Error)));
    });
});

describe("analytics store period selection", () => {
    beforeEach(() => {
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        useAnalyticsStore.setState(initialState, true);
    });

    it("refetches with the new period even when data was already fetched", async () => {
        mockAnalyticsApi();
        useAnalyticsStore.getState().fetchAnalytics();
        await settleRequests();
        vi.mocked(fetchWithAuth).mockClear();

        useAnalyticsStore.getState().setPeriod("P30D");
        await settleRequests();

        expect(useAnalyticsStore.getState().period).toBe("P30D");
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?period=P30D`);
        expect(requestedUrls().every((url) => !url.includes("period=P7D"))).toBe(true);
    });

    it("uses the number in the period to size the comparison window", async () => {
        mockAnalyticsApi();

        useAnalyticsStore.getState().setPeriod("P30D");
        await settleRequests();

        const previousEnd = new Date(NOW.getTime() - 30 * MS_PER_DAY);
        const previousStart = new Date(NOW.getTime() - 60 * MS_PER_DAY);
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${isoDay(previousStart)}&end=${isoDay(previousEnd)}`);
    });

    it("switches to a custom period and queries explicit dates once the range is complete", async () => {
        mockAnalyticsApi();
        const from = new Date("2026-09-01T00:00:00Z");
        const to = new Date("2026-09-15T00:00:00Z");

        useAnalyticsStore.getState().setCustomDateRange({from, to});
        await settleRequests();

        expect(useAnalyticsStore.getState().period).toBe("custom");
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=2026-09-01&end=2026-09-15`);
    });

    it("clears the previous period comparison for a custom range", async () => {
        mockAnalyticsApi();
        useAnalyticsStore.setState({previousTotalClicks: 30});

        useAnalyticsStore.getState().setCustomDateRange({from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-09-15T00:00:00Z")});
        await settleRequests();

        expect(useAnalyticsStore.getState().previousTotalClicks).toBeNull();
    });

    it("waits for both ends of the range before refetching", () => {
        useAnalyticsStore.getState().setCustomDateRange({from: new Date("2026-09-01T00:00:00Z"), to: undefined});

        expect(useAnalyticsStore.getState().period).toBe("P7D");
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("ignores a cleared range without refetching", () => {
        useAnalyticsStore.getState().setCustomDateRange(undefined);

        expect(useAnalyticsStore.getState().customDateRange).toBeUndefined();
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });
});

describe("analytics store tabs", () => {
    afterEach(() => {
        useAnalyticsStore.setState(initialState, true);
    });

    it("fetches continents when the continents tab is opened for the first time", async () => {
        mockAnalyticsApi({continent: Response.json([{label: "Europe", clicks: 2}])});

        useAnalyticsStore.getState().setLocationTab("continents");

        await vi.waitFor(() => expect(useAnalyticsStore.getState().continents).toEqual([{label: "Europe", clicks: 2}]));
        expect(useAnalyticsStore.getState().locationTab).toBe("continents");
        expect(useAnalyticsStore.getState().isLocationLoading).toBe(false);
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=continent`]);
    });

    it("reuses already loaded location data instead of refetching", () => {
        useAnalyticsStore.setState({continents: [{label: "Europe", clicks: 2}]});

        useAnalyticsStore.getState().setLocationTab("continents");

        expect(useAnalyticsStore.getState().locationTab).toBe("continents");
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("fetches operating systems when the OS tab is opened for the first time", async () => {
        mockAnalyticsApi({os: Response.json([{label: "iOS", clicks: 4}])});

        useAnalyticsStore.getState().setDeviceTab("os");

        await vi.waitFor(() => expect(useAnalyticsStore.getState().os).toEqual([{label: "iOS", clicks: 4}]));
        expect(useAnalyticsStore.getState().deviceTab).toBe("os");
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=os`]);
    });

    it("reuses already loaded device data instead of refetching", () => {
        useAnalyticsStore.setState({os: [{label: "iOS", clicks: 4}]});

        useAnalyticsStore.getState().setDeviceTab("os");

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("refetches the selected tab again when it has no data", async () => {
        mockAnalyticsApi({country: Response.json([])});
        useAnalyticsStore.getState().setLocationTab("continents");
        await settleRequests();
        vi.mocked(fetchWithAuth).mockClear();

        useAnalyticsStore.getState().setLocationTab("continents");
        await settleRequests();

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });
});
