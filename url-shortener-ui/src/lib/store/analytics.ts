import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {DateRange} from "react-day-picker";
import {LinkItem} from "@/lib/types";
import {API_ENDPOINTS, DEFAULT_PERIOD_DAYS} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsGroupedClick {
    label: string;
    clicks: number;
    hostname?: string;
}

export interface AnalyticsDailyClick {
    date: string;
    clicks: number;
}

export interface AnalyticsTopLinkClick {
    shortLinkId: string;
    clicks: number;
}

type LocationTab = "countries" | "continents";
type DeviceTab = "devices" | "os";

interface AnalyticsStore {
    period: string;
    customDateRange: DateRange | undefined;
    totalClicks: number;
    previousTotalClicks: number | null;
    timeSeries: AnalyticsDailyClick[];
    countries: AnalyticsGroupedClick[];
    continents: AnalyticsGroupedClick[];
    devices: AnalyticsGroupedClick[];
    os: AnalyticsGroupedClick[];
    referrers: AnalyticsGroupedClick[];
    topLinks: (AnalyticsTopLinkClick & { details?: LinkItem })[];
    loading: boolean;
    isLocationLoading: boolean;
    isDeviceLoading: boolean;
    error: string | null;
    locationTab: LocationTab;
    deviceTab: DeviceTab;
    hasFetched: boolean;
    setLocationTab: (tab: LocationTab) => void;
    setDeviceTab: (tab: DeviceTab) => void;
    setPeriod: (period: string) => void;
    setCustomDateRange: (range: DateRange | undefined) => void;
    fetchAnalytics: (force?: boolean) => void;
    fetchLocationData: (tab: LocationTab) => void;
    fetchDeviceData: (tab: DeviceTab) => void;
}

// ---------------------------------------------------------------------------
// Query-param builder (single source of truth)
// ---------------------------------------------------------------------------

function buildQueryParams(period: string, customDateRange: DateRange | undefined): string {
    if (period === "custom" && customDateRange?.from && customDateRange?.to) {
        const startStr = customDateRange.from.toISOString().split("T")[0];
        const endStr = customDateRange.to.toISOString().split("T")[0];
        return `?start=${startStr}&end=${endStr}`;
    }
    return `?period=${period}`;
}

const PERIOD_DAYS_REGEX = /\d+/;

function buildPreviousPeriodParams(period: string): string | null {
    if (period === "custom") return null;

    const match = period.match(PERIOD_DAYS_REGEX);
    const days = match ? parseInt(match[0], 10) : DEFAULT_PERIOD_DAYS;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - days);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    return `?start=${startStr}&end=${endStr}`;
}

// ---------------------------------------------------------------------------
// Individual fetch helpers
// ---------------------------------------------------------------------------

function fetchTotalClicks(
    queryParams: string,
    set: (partial: Partial<AnalyticsStore>) => void,
): void {
    fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${queryParams}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (typeof data === "number") set({totalClicks: data, loading: false});
        })
        .catch((e) => console.error("Total clicks fetch error", e));
}

function fetchPreviousPeriodClicks(
    period: string,
    set: (partial: Partial<AnalyticsStore>) => void,
): void {
    const params = buildPreviousPeriodParams(period);
    if (!params) {
        set({previousTotalClicks: null});
        return;
    }

    fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${params}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
            if (typeof data === "number") set({previousTotalClicks: data});
        })
        .catch((e) => console.error("Previous total clicks fetch error", e));
}

function fetchTimeSeries(
    queryParams: string,
    set: (partial: Partial<AnalyticsStore>) => void,
): void {
    fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${queryParams}&groupBy=date`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => set({timeSeries: data}))
        .catch((e) => console.error("Time series fetch error", e));
}

function fetchReferrers(
    queryParams: string,
    set: (partial: Partial<AnalyticsStore>) => void,
): void {
    fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${queryParams}&groupBy=referrer`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => set({referrers: data}))
        .catch((e) => console.error("Referrers fetch error", e));
}

async function fetchTopLinks(
    queryParams: string,
    set: (partial: Partial<AnalyticsStore>) => void,
): Promise<void> {
    try {
        const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${queryParams}&groupBy=top_link`);
        const data: AnalyticsTopLinkClick[] = res.ok ? await res.json() : [];

        const enriched = await enrichTopLinksWithDetails(data);
        set({topLinks: enriched});
    } catch (e) {
        console.error("Top Links fetch error", e);
    }
}

async function enrichTopLinksWithDetails(
    data: AnalyticsTopLinkClick[],
): Promise<(AnalyticsTopLinkClick & { details?: LinkItem })[]> {
    if (data.length === 0) return data;

    const ids = data
        .map((d) => d.shortLinkId)
        .filter(Boolean)
        .join(",");
    if (!ids) return data;

    try {
        const detailsRes = await fetchWithAuth(`${API_ENDPOINTS.SHORTLINKS_BY_IDS}?ids=${ids}`);
        if (!detailsRes.ok) return data;

        const detailsData: LinkItem[] = await detailsRes.json();
        const detailsMap = new Map(detailsData.map((d) => [d.id, d]));
        return data.map((d) => ({...d, details: detailsMap.get(d.shortLinkId)}));
    } catch (e) {
        console.error("Top Links details fetch error", e);
        return data;
    }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
    period: "P7D",
    customDateRange: undefined,
    totalClicks: 0,
    previousTotalClicks: null,
    timeSeries: [],
    countries: [],
    continents: [],
    devices: [],
    os: [],
    referrers: [],
    topLinks: [],
    loading: true,
    isLocationLoading: false,
    isDeviceLoading: false,
    error: null,
    locationTab: "countries",
    deviceTab: "devices",
    hasFetched: false,

    setLocationTab: (tab) => {
        set({locationTab: tab});
        const {countries, continents} = get();
        const data = tab === "countries" ? countries : continents;
        if (!data || data.length === 0) {
            get().fetchLocationData(tab);
        }
    },

    setDeviceTab: (tab) => {
        set({deviceTab: tab});
        const {devices, os} = get();
        const data = tab === "devices" ? devices : os;
        if (!data || data.length === 0) {
            get().fetchDeviceData(tab);
        }
    },

    setPeriod: (period) => {
        set({period});
        get().fetchAnalytics(true);
    },

    setCustomDateRange: (range) => {
        set({customDateRange: range});
        if (range?.from && range?.to) {
            set({period: "custom"});
            get().fetchAnalytics(true);
        }
    },

    fetchAnalytics: (force = false) => {
        const {period, customDateRange, hasFetched} = get();
        if (!force && hasFetched) return;

        set({loading: true, isLocationLoading: true, isDeviceLoading: true, error: null, hasFetched: true});

        const queryParams = buildQueryParams(period, customDateRange);

        fetchTotalClicks(queryParams, set);
        fetchPreviousPeriodClicks(period, set);
        fetchTimeSeries(queryParams, set);
        fetchReferrers(queryParams, set);
        fetchTopLinks(queryParams, set);

        get().fetchLocationData(get().locationTab);
        get().fetchDeviceData(get().deviceTab);
    },

    fetchLocationData: (tab) => {
        const {period, customDateRange} = get();
        set({isLocationLoading: true});

        const queryParams = buildQueryParams(period, customDateRange);
        const groupBy = tab === "countries" ? "country" : "continent";

        fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${queryParams}&groupBy=${groupBy}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                if (tab === "countries") set({countries: data, isLocationLoading: false});
                else set({continents: data, isLocationLoading: false});
            })
            .catch((e) => {
                console.error(`${tab} fetch error`, e);
                set({isLocationLoading: false});
            });
    },

    fetchDeviceData: (tab) => {
        const {period, customDateRange} = get();
        set({isDeviceLoading: true});

        const queryParams = buildQueryParams(period, customDateRange);
        const groupBy = tab === "devices" ? "device" : "os";

        fetchWithAuth(`${API_ENDPOINTS.ANALYTICS}${queryParams}&groupBy=${groupBy}`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                if (tab === "devices") set({devices: data, isDeviceLoading: false});
                else set({os: data, isDeviceLoading: false});
            })
            .catch((e) => {
                console.error(`${tab} fetch error`, e);
                set({isDeviceLoading: false});
            });
    },
}));
