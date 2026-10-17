import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {formatLocalIsoDate} from "@/lib/date-utils";
import {logger} from "@/lib/logger";
import {ANALYTICS_STALE_AFTER_MS, useAnalyticsStore} from "@/lib/store/analytics";
import {createLinkItem} from "@/test/link-utils";
import {FAR_FROM_UTC_TIME_ZONES} from "@/test/time-zone-utils";

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

async function settleRequests(): Promise<void> {
    await vi.waitFor(() => expect(Object.values(useAnalyticsStore.getState().status)).not.toContain("loading"));
}

async function loadOnce(): Promise<void> {
    useAnalyticsStore.getState().loadAnalytics();
    await settleRequests();
}

function loadedAt(): number {
    const {overviewLoadedAt} = useAnalyticsStore.getState();
    if (overviewLoadedAt === null) throw new Error("The overview has not loaded");
    return overviewLoadedAt;
}

function signalOf(urlPart: string): AbortSignal | undefined {
    const call = vi.mocked(fetchWithAuth).mock.calls.find(([url]) => url.includes(urlPart));
    return call?.[1]?.signal ?? undefined;
}

const SERVER_ERROR = 500;
const TIME_SERIES = [{date: "2026-10-11", clicks: 5}];

describe("analytics store loading", () => {
    beforeEach(() => {
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        useAnalyticsStore.setState(initialState, true);
    });

    it("starts with nothing loaded", () => {
        const state = useAnalyticsStore.getState();

        expect(state.overviewLoadedAt).toBeNull();
        expect(Object.values(state.status)).toEqual(["idle", "idle", "idle", "idle"]);
        expect(state.period).toBe("P7D");
    });

    it("loads every analytics section for the default period", async () => {
        mockAnalyticsApi({
            total: Response.json(42),
            previous: Response.json(30),
            date: Response.json(TIME_SERIES),
            referrer: Response.json([{label: "google.com", clicks: 3}]),
            country: Response.json([{label: "Canada", clicks: 7}]),
            device: Response.json([{label: "Mobile", clicks: 9}]),
        });

        await loadOnce();

        const state = useAnalyticsStore.getState();
        expect(state.totalClicks).toBe(42);
        expect(state.previousTotalClicks).toBe(30);
        expect(state.timeSeries).toEqual(TIME_SERIES);
        expect(state.referrers).toEqual([{label: "google.com", clicks: 3}]);
        expect(state.countries).toEqual([{label: "Canada", clicks: 7}]);
        expect(state.devices).toEqual([{label: "Mobile", clicks: 9}]);
        expect(state.overviewLoadedAt).toBeGreaterThanOrEqual(NOW.getTime());
        expect(Object.values(state.status)).toEqual(["ready", "ready", "ready", "ready"]);
    });

    it("queries each breakdown for the selected period", async () => {
        mockAnalyticsApi();

        await loadOnce();

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

        await loadOnce();

        const periodEnd = new Date(NOW.getTime() - 7 * MS_PER_DAY);
        const periodStart = new Date(NOW.getTime() - 14 * MS_PER_DAY);
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${formatLocalIsoDate(periodStart)}&end=${formatLocalIsoDate(periodEnd)}`);
    });

    it("marks every section as loading while the first load is pending", () => {
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => undefined));

        useAnalyticsStore.getState().loadAnalytics();

        expect(Object.values(useAnalyticsStore.getState().status)).toEqual(["loading", "loading", "loading", "loading"]);
    });

    it("does not start a second load while the first one is running", () => {
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => undefined));
        useAnalyticsStore.getState().loadAnalytics();
        const callsAfterFirstLoad = vi.mocked(fetchWithAuth).mock.calls.length;

        useAnalyticsStore.getState().loadAnalytics();

        expect(fetchWithAuth).toHaveBeenCalledTimes(callsAfterFirstLoad);
    });

    it("does not refetch data that is still fresh when the page is opened again", async () => {
        mockAnalyticsApi();
        await loadOnce();
        vi.mocked(fetchWithAuth).mockClear();

        vi.setSystemTime(loadedAt() + ANALYTICS_STALE_AFTER_MS - 1);
        useAnalyticsStore.getState().loadAnalytics();

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("refreshes stale data in the background without a visible loading state", async () => {
        mockAnalyticsApi({date: Response.json(TIME_SERIES)});
        await loadOnce();
        const refreshedSeries = [{date: "2026-10-12", clicks: 8}];
        mockAnalyticsApi({date: Response.json(refreshedSeries)});
        const refreshedAt = loadedAt() + ANALYTICS_STALE_AFTER_MS;
        vi.setSystemTime(refreshedAt);

        useAnalyticsStore.getState().loadAnalytics();

        expect(useAnalyticsStore.getState().status.overview).toBe("ready");
        await vi.waitFor(() => expect(useAnalyticsStore.getState().timeSeries).toEqual(refreshedSeries));
        expect(loadedAt()).toBeGreaterThanOrEqual(refreshedAt);
    });

    it("keeps the data on screen and logs when a background refresh fails", async () => {
        mockAnalyticsApi({date: Response.json(TIME_SERIES)});
        await loadOnce();
        mockAnalyticsApi({date: new Response(null, {status: SERVER_ERROR})});
        vi.setSystemTime(loadedAt() + ANALYTICS_STALE_AFTER_MS);

        useAnalyticsStore.getState().loadAnalytics();

        await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith("Analytics overview fetch error", expect.any(Error)));
        expect(useAnalyticsStore.getState().timeSeries).toEqual(TIME_SERIES);
        expect(useAnalyticsStore.getState().status.overview).toBe("ready");
    });
});

describe("analytics store errors", () => {
    afterEach(() => {
        useAnalyticsStore.setState(initialState, true);
    });

    it.each([
        ["the total fails with an HTTP error", {total: new Response(null, {status: SERVER_ERROR})}],
        ["the total is not a number", {total: Response.json({clicks: 3})}],
        ["the time series fails", {date: new Response(null, {status: SERVER_ERROR})}],
        ["the referrers request is offline", {referrer: new Error("offline")}],
    ])("marks the overview failed instead of showing empty data when %s", async (_name, routes: Routes) => {
        mockAnalyticsApi(routes);

        await loadOnce();

        expect(useAnalyticsStore.getState().status.overview).toBe("error");
        expect(useAnalyticsStore.getState().overviewLoadedAt).toBeNull();
        expect(logger.error).toHaveBeenCalledWith("Analytics overview fetch error", expect.any(Error));
    });

    it("hides the comparison without failing the overview when the previous period fails", async () => {
        mockAnalyticsApi({previous: new Response(null, {status: SERVER_ERROR})});
        useAnalyticsStore.setState({previousTotalClicks: 12});

        await loadOnce();

        expect(useAnalyticsStore.getState().previousTotalClicks).toBeNull();
        expect(useAnalyticsStore.getState().status.overview).toBe("ready");
    });

    it("marks only the failed breakdowns as failed", async () => {
        mockAnalyticsApi({country: new Response(null, {status: SERVER_ERROR}), device: new Error("offline")});

        await loadOnce();

        expect(useAnalyticsStore.getState().status).toEqual({overview: "ready", topLinks: "ready", location: "error", device: "error"});
        expect(logger.error).toHaveBeenCalledWith("Location analytics fetch error", expect.any(Error));
        expect(logger.error).toHaveBeenCalledWith("Device analytics fetch error", expect.any(Error));
    });

    it("retries only the section that failed", async () => {
        mockAnalyticsApi({country: new Response(null, {status: SERVER_ERROR})});
        await loadOnce();
        mockAnalyticsApi({country: Response.json([{label: "Canada", clicks: 7}])});
        vi.mocked(fetchWithAuth).mockClear();

        useAnalyticsStore.getState().retrySection("location");
        await settleRequests();

        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=country`]);
        expect(useAnalyticsStore.getState().status.location).toBe("ready");
        expect(useAnalyticsStore.getState().countries).toEqual([{label: "Canada", clicks: 7}]);
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

        await loadOnce();

        expect(useAnalyticsStore.getState().topLinks[0]).toEqual({shortLinkId: "link-1", clicks: 9, details});
        expect(useAnalyticsStore.getState().topLinks[1].details).toBeUndefined();
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.SHORTLINKS_BY_IDS}?ids=link-1,link-2`);
    });

    it("does not request details when there are no top links", async () => {
        mockAnalyticsApi({top_link: Response.json([])});

        await loadOnce();

        expect(requestedUrls().some((url) => url.startsWith(API_ENDPOINTS.SHORTLINKS_BY_IDS))).toBe(false);
        expect(useAnalyticsStore.getState().topLinks).toEqual([]);
    });

    it("shows top links without details when the details request fails", async () => {
        mockAnalyticsApi({
            top_link: Response.json([{shortLinkId: "link-1", clicks: 9}]),
            byIds: new Response(null, {status: SERVER_ERROR}),
        });

        await loadOnce();

        expect(useAnalyticsStore.getState().topLinks).toEqual([{shortLinkId: "link-1", clicks: 9}]);
        expect(useAnalyticsStore.getState().status.topLinks).toBe("ready");
    });

    it("shows top links without details and logs when the details request rejects", async () => {
        mockAnalyticsApi({
            top_link: Response.json([{shortLinkId: "link-1", clicks: 9}]),
            byIds: new Error("offline"),
        });

        await loadOnce();

        expect(useAnalyticsStore.getState().topLinks).toEqual([{shortLinkId: "link-1", clicks: 9}]);
        expect(logger.error).toHaveBeenCalledWith("Top Links details fetch error", expect.any(Error));
    });

    it("marks top links failed when the top links request fails", async () => {
        mockAnalyticsApi({top_link: new Response(null, {status: SERVER_ERROR})});

        await loadOnce();

        expect(useAnalyticsStore.getState().status.topLinks).toBe("error");
        expect(logger.error).toHaveBeenCalledWith("Top links fetch error", expect.any(Error));
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

    it("refetches with the new period even when data is fresh", async () => {
        mockAnalyticsApi();
        await loadOnce();
        vi.mocked(fetchWithAuth).mockClear();

        useAnalyticsStore.getState().setPeriod("P30D");
        await settleRequests();

        expect(useAnalyticsStore.getState().period).toBe("P30D");
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?period=P30D`);
        expect(requestedUrls().every((url) => !url.includes("period=P7D"))).toBe(true);
    });

    it("keeps the previous data on screen while the new period loads", async () => {
        mockAnalyticsApi({date: Response.json(TIME_SERIES)});
        await loadOnce();
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => undefined));

        useAnalyticsStore.getState().setPeriod("P30D");

        expect(useAnalyticsStore.getState().status.overview).toBe("loading");
        expect(useAnalyticsStore.getState().timeSeries).toEqual(TIME_SERIES);
    });

    it("applies only the newest period when an older response arrives last", async () => {
        const olderPeriod = Promise.withResolvers<Response>();
        vi.mocked(fetchWithAuth).mockImplementation(async (url) => {
            if (url === `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=date`) return olderPeriod.promise;
            if (url.includes("groupBy=date")) return Response.json([{date: "2026-09-20", clicks: 30}]);
            return DEFAULT_ROUTES[routeKeyFor(url)].clone();
        });
        useAnalyticsStore.getState().loadAnalytics();

        useAnalyticsStore.getState().setPeriod("P30D");
        await settleRequests();
        olderPeriod.resolve(Response.json(TIME_SERIES));
        await Promise.resolve();

        expect(useAnalyticsStore.getState().timeSeries).toEqual([{date: "2026-09-20", clicks: 30}]);
        expect(signalOf("period=P7D&groupBy=date")?.aborted).toBe(true);
    });

    it("forgets the hidden breakdown tabs so they reload for the new period", async () => {
        mockAnalyticsApi();
        useAnalyticsStore.setState({continents: [{label: "Europe", clicks: 2}], os: [{label: "iOS", clicks: 4}]});

        useAnalyticsStore.getState().setPeriod("P30D");

        expect(useAnalyticsStore.getState().continents).toEqual([]);
        expect(useAnalyticsStore.getState().os).toEqual([]);
        await settleRequests();
    });

    it("uses the number in the period to size the comparison window", async () => {
        mockAnalyticsApi();

        useAnalyticsStore.getState().setPeriod("P30D");
        await settleRequests();

        const previousEnd = new Date(NOW.getTime() - 30 * MS_PER_DAY);
        const previousStart = new Date(NOW.getTime() - 60 * MS_PER_DAY);
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${formatLocalIsoDate(previousStart)}&end=${formatLocalIsoDate(previousEnd)}`);
    });

    it("switches to a custom period and queries explicit dates once the range is complete", async () => {
        mockAnalyticsApi();
        const from = new Date(2026, 8, 1);
        const to = new Date(2026, 8, 15);

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
        await settleRequests();

        expect(useAnalyticsStore.getState().continents).toEqual([{label: "Europe", clicks: 2}]);
        expect(useAnalyticsStore.getState().locationTab).toBe("continents");
        expect(useAnalyticsStore.getState().status.location).toBe("ready");
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
        await settleRequests();

        expect(useAnalyticsStore.getState().os).toEqual([{label: "iOS", clicks: 4}]);
        expect(useAnalyticsStore.getState().deviceTab).toBe("os");
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=os`]);
    });

    it("reuses already loaded device data instead of refetching", () => {
        useAnalyticsStore.setState({os: [{label: "iOS", clicks: 4}]});

        useAnalyticsStore.getState().setDeviceTab("os");

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("refetches the selected tab again when it has no data", async () => {
        mockAnalyticsApi({continent: Response.json([])});
        useAnalyticsStore.getState().setLocationTab("continents");
        await settleRequests();
        vi.mocked(fetchWithAuth).mockClear();

        useAnalyticsStore.getState().setLocationTab("continents");
        await settleRequests();

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });
});

describe.each([
    {timeZone: FAR_FROM_UTC_TIME_ZONES[0], previousStart: "2026-09-29", previousEnd: "2026-10-06"},
    {timeZone: FAR_FROM_UTC_TIME_ZONES[1], previousStart: "2026-09-28", previousEnd: "2026-10-05"},
])("analytics store dates in $timeZone", ({timeZone, previousStart, previousEnd}) => {
    beforeEach(() => {
        vi.stubEnv("TZ", timeZone);
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        useAnalyticsStore.setState(initialState, true);
    });

    it("sends the picked local calendar days for a custom range", async () => {
        mockAnalyticsApi();

        useAnalyticsStore.getState().setCustomDateRange({from: new Date(2026, 8, 1), to: new Date(2026, 8, 15)});
        await settleRequests();

        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=2026-09-01&end=2026-09-15`);
    });

    it("computes the comparison window from the local date of today", async () => {
        mockAnalyticsApi();

        useAnalyticsStore.getState().setPeriod("P7D");
        await settleRequests();

        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=${previousStart}&end=${previousEnd}`);
    });
});
