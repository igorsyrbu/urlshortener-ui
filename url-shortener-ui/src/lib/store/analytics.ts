import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import type {DateRange} from "react-day-picker";
import {LinkItem} from "@/lib/types";
import {API_ENDPOINTS, DEFAULT_PERIOD_DAYS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {formatLocalIsoDate} from "@/lib/date-utils";

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

interface AnalyticsTopLinkClick {
    shortLinkId: string;
    clicks: number;
}

export type AnalyticsTopLink = AnalyticsTopLinkClick & {details?: LinkItem};
export type LocationTab = "countries" | "continents";
export type DeviceTab = "devices" | "os";

/** `idle` before the first request; `loading` only for loads the user should see (skeleton, spinner or dimming). */
export type SectionStatus = "idle" | "loading" | "ready" | "error";
export type AnalyticsSection = "overview" | "topLinks" | "location" | "device";
type LoadMode = "visible" | "silent";

/** Data on screen that is younger than this is not refetched when the page is opened again. */
export const ANALYTICS_STALE_AFTER_MS = 60_000;

interface OverviewData {
    totalClicks: number;
    previousTotalClicks: number | null;
    timeSeries: AnalyticsDailyClick[];
    referrers: AnalyticsGroupedClick[];
}

interface AnalyticsState extends OverviewData {
    period: string;
    customDateRange: DateRange | undefined;
    topLinks: AnalyticsTopLink[];
    countries: AnalyticsGroupedClick[];
    continents: AnalyticsGroupedClick[];
    devices: AnalyticsGroupedClick[];
    os: AnalyticsGroupedClick[];
    status: Record<AnalyticsSection, SectionStatus>;
    /** When the overview currently on screen was loaded; `null` until the first successful load. */
    overviewLoadedAt: number | null;
    locationTab: LocationTab;
    deviceTab: DeviceTab;
}

interface AnalyticsActions {
    setLocationTab: (tab: LocationTab) => void;
    setDeviceTab: (tab: DeviceTab) => void;
    setPeriod: (period: string) => void;
    setCustomDateRange: (range: DateRange | undefined) => void;
    /** Called on page mount: loads on first visit, refreshes stale data in the background, skips fresh data. */
    loadAnalytics: () => void;
    retrySection: (section: AnalyticsSection) => void;
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;
type SetState = (partial: Partial<AnalyticsState>) => void;
type GetState = () => AnalyticsStore;

const SECTION_LOG_ERRORS: Record<AnalyticsSection, string> = {
    overview: "Analytics overview fetch error",
    topLinks: "Top links fetch error",
    location: "Location analytics fetch error",
    device: "Device analytics fetch error",
};

// ---------------------------------------------------------------------------
// Query building
// ---------------------------------------------------------------------------

function buildQueryParams(period: string, customDateRange: DateRange | undefined): string {
    if (period === "custom" && customDateRange?.from && customDateRange?.to) {
        return `?start=${formatLocalIsoDate(customDateRange.from)}&end=${formatLocalIsoDate(customDateRange.to)}`;
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

    return `?start=${formatLocalIsoDate(startDate)}&end=${formatLocalIsoDate(endDate)}`;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function isNumber(value: unknown): value is number {
    return typeof value === "number";
}

function isList<T>(value: unknown): value is T[] {
    return Array.isArray(value);
}

/** Throws on HTTP errors and unexpected payloads, so a failure is never shown as "no data". */
async function requestAnalytics<T>(path: string, signal: AbortSignal, isValid: (value: unknown) => value is T): Promise<T> {
    const response = await fetchWithAuth(path, {signal});
    if (!response.ok) throw new Error(`Analytics request failed: ${response.status}`);
    const payload: unknown = await response.json();
    if (!isValid(payload)) throw new Error("Unexpected analytics response");
    return payload;
}

async function requestPreviousTotal(period: string, signal: AbortSignal): Promise<number | null> {
    const params = buildPreviousPeriodParams(period);
    if (!params) return null;
    try {
        return await requestAnalytics(`${API_ENDPOINTS.ANALYTICS}${params}`, signal, isNumber);
    } catch (error) {
        if (!signal.aborted) logger.error("Previous total clicks fetch error", error);
        return null;
    }
}

async function requestOverview(state: AnalyticsState, signal: AbortSignal): Promise<OverviewData> {
    const query = `${API_ENDPOINTS.ANALYTICS}${buildQueryParams(state.period, state.customDateRange)}`;
    const [totalClicks, previousTotalClicks, timeSeries, referrers] = await Promise.all([
        requestAnalytics(query, signal, isNumber),
        requestPreviousTotal(state.period, signal),
        requestAnalytics(`${query}&groupBy=date`, signal, isList<AnalyticsDailyClick>),
        requestAnalytics(`${query}&groupBy=referrer`, signal, isList<AnalyticsGroupedClick>),
    ]);
    return {totalClicks, previousTotalClicks, timeSeries, referrers};
}

async function enrichTopLinksWithDetails(topLinks: AnalyticsTopLinkClick[], signal: AbortSignal): Promise<AnalyticsTopLink[]> {
    const ids = topLinks.map((link) => link.shortLinkId).filter(Boolean).join(",");
    if (!ids) return topLinks;
    try {
        const details = await requestAnalytics(`${API_ENDPOINTS.SHORTLINKS_BY_IDS}?ids=${ids}`, signal, isList<LinkItem>);
        const detailsById = new Map(details.map((link) => [link.id, link]));
        return topLinks.map((link) => ({...link, details: detailsById.get(link.shortLinkId)}));
    } catch (error) {
        if (signal.aborted) throw error;
        logger.error("Top Links details fetch error", error);
        return topLinks;
    }
}

async function requestTopLinks(state: AnalyticsState, signal: AbortSignal): Promise<AnalyticsTopLink[]> {
    const query = buildQueryParams(state.period, state.customDateRange);
    const topLinks = await requestAnalytics(
        `${API_ENDPOINTS.ANALYTICS}${query}&groupBy=top_link`, signal, isList<AnalyticsTopLinkClick>,
    );
    return enrichTopLinksWithDetails(topLinks, signal);
}

function requestBreakdown(state: AnalyticsState, groupBy: string, signal: AbortSignal): Promise<AnalyticsGroupedClick[]> {
    const query = buildQueryParams(state.period, state.customDateRange);
    return requestAnalytics(`${API_ENDPOINTS.ANALYTICS}${query}&groupBy=${groupBy}`, signal, isList<AnalyticsGroupedClick>);
}

// ---------------------------------------------------------------------------
// Latest-wins section loading
// ---------------------------------------------------------------------------

const sectionControllers: Partial<Record<AnalyticsSection, AbortController>> = {};

/** Aborts the section's previous request: only the newest request of a section may write its data. */
function startSectionRequest(section: AnalyticsSection): AbortController {
    sectionControllers[section]?.abort();
    const controller = new AbortController();
    sectionControllers[section] = controller;
    return controller;
}

function setSectionStatus(get: GetState, set: SetState, section: AnalyticsSection, status: SectionStatus): void {
    set({status: {...get().status, [section]: status}});
}

async function loadSection<T>(
    get: GetState,
    set: SetState,
    section: AnalyticsSection,
    mode: LoadMode,
    request: (state: AnalyticsState, signal: AbortSignal) => Promise<T>,
    toState: (data: T) => Partial<AnalyticsState>,
): Promise<void> {
    const controller = startSectionRequest(section);
    if (mode === "visible") setSectionStatus(get, set, section, "loading");
    try {
        const data = await request(get(), controller.signal);
        if (sectionControllers[section] !== controller) return;
        set({...toState(data), status: {...get().status, [section]: "ready"}});
    } catch (error) {
        if (sectionControllers[section] !== controller) return;
        logger.error(SECTION_LOG_ERRORS[section], error);
        if (mode === "visible") setSectionStatus(get, set, section, "error");
    }
}

function loadOverview(get: GetState, set: SetState, mode: LoadMode): Promise<void> {
    return loadSection(get, set, "overview", mode, requestOverview, (data) => ({...data, overviewLoadedAt: Date.now()}));
}

function loadTopLinks(get: GetState, set: SetState, mode: LoadMode): Promise<void> {
    return loadSection(get, set, "topLinks", mode, requestTopLinks, (topLinks) => ({topLinks}));
}

function loadLocation(get: GetState, set: SetState, mode: LoadMode): Promise<void> {
    const tab = get().locationTab;
    const groupBy = tab === "countries" ? "country" : "continent";
    return loadSection(get, set, "location", mode, (state, signal) => requestBreakdown(state, groupBy, signal),
        (data) => (tab === "countries" ? {countries: data} : {continents: data}));
}

function loadDevice(get: GetState, set: SetState, mode: LoadMode): Promise<void> {
    const tab = get().deviceTab;
    const groupBy = tab === "devices" ? "device" : "os";
    return loadSection(get, set, "device", mode, (state, signal) => requestBreakdown(state, groupBy, signal),
        (data) => (tab === "devices" ? {devices: data} : {os: data}));
}

function loadAllSections(get: GetState, set: SetState, mode: LoadMode): void {
    void loadOverview(get, set, mode);
    void loadTopLinks(get, set, mode);
    void loadLocation(get, set, mode);
    void loadDevice(get, set, mode);
}

/** A new period invalidates the hidden breakdown tabs too, so they reload when opened instead of showing old data. */
function clearHiddenBreakdowns(get: GetState): Partial<AnalyticsState> {
    const {locationTab, deviceTab} = get();
    return {
        ...(locationTab === "countries" ? {continents: []} : {countries: []}),
        ...(deviceTab === "devices" ? {os: []} : {devices: []}),
    };
}

function changeSelection(get: GetState, set: SetState, selection: Partial<AnalyticsState>): void {
    set({...selection, ...clearHiddenBreakdowns(get)});
    loadAllSections(get, set, "visible");
}

const SECTION_LOADERS: Record<AnalyticsSection, (get: GetState, set: SetState, mode: LoadMode) => Promise<void>> = {
    overview: loadOverview,
    topLinks: loadTopLinks,
    location: loadLocation,
    device: loadDevice,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const INITIAL_STATUS: Record<AnalyticsSection, SectionStatus> = {
    overview: "idle",
    topLinks: "idle",
    location: "idle",
    device: "idle",
};

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
    status: INITIAL_STATUS,
    overviewLoadedAt: null,
    locationTab: "countries",
    deviceTab: "devices",

    setLocationTab: (tab) => {
        set({locationTab: tab});
        const {countries, continents} = get();
        const data = tab === "countries" ? countries : continents;
        if (data.length === 0) void loadLocation(get, set, "visible");
    },

    setDeviceTab: (tab) => {
        set({deviceTab: tab});
        const {devices, os} = get();
        const data = tab === "devices" ? devices : os;
        if (data.length === 0) void loadDevice(get, set, "visible");
    },

    setPeriod: (period) => {
        changeSelection(get, set, {period});
    },

    setCustomDateRange: (range) => {
        if (!range?.from || !range?.to) {
            set({customDateRange: range});
            return;
        }
        changeSelection(get, set, {customDateRange: range, period: "custom"});
    },

    loadAnalytics: () => {
        const {overviewLoadedAt, status} = get();
        if (status.overview === "loading") return;
        if (overviewLoadedAt === null) {
            loadAllSections(get, set, "visible");
            return;
        }
        if (Date.now() - overviewLoadedAt < ANALYTICS_STALE_AFTER_MS) return;
        loadAllSections(get, set, "silent");
    },

    retrySection: (section) => {
        void SECTION_LOADERS[section](get, set, "visible");
    },
}));
