import {requestJson} from "@/lib/api-request";
import {API_ENDPOINTS, DEFAULT_PERIOD_DAYS} from "@/lib/constants";
import {formatLocalIsoDate} from "@/lib/date-utils";
import {logger} from "@/lib/logger";
import type {LinkItem} from "@/lib/types";

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

/** The summary card: the total, the same-length period before it (`null` for a custom range or when it failed), and clicks per day. */
export interface AnalyticsOverview {
    totalClicks: number;
    previousTotalClicks: number | null;
    timeSeries: AnalyticsDailyClick[];
}

/** A preset period (`P7D`), or the local calendar days of a custom range, as the API takes them. */
export type AnalyticsRange = {period: string} | {start: string; end: string};

export type AnalyticsBreakdown = "country" | "continent" | "device" | "os";

export function presetAnalyticsRange(period: string): AnalyticsRange {
    return {period};
}

export function customAnalyticsRange(from: Date, to: Date): AnalyticsRange {
    return {start: formatLocalIsoDate(from), end: formatLocalIsoDate(to)};
}

function buildRangeEndpoint(range: AnalyticsRange): string {
    if ("period" in range) return `${API_ENDPOINTS.ANALYTICS}?period=${range.period}`;
    return `${API_ENDPOINTS.ANALYTICS}?start=${range.start}&end=${range.end}`;
}

function buildGroupedEndpoint(range: AnalyticsRange, groupBy: string): string {
    return `${buildRangeEndpoint(range)}&groupBy=${groupBy}`;
}

const PERIOD_DAYS_REGEX = /\d+/;

function previousPeriodRange(range: AnalyticsRange): AnalyticsRange | null {
    if (!("period" in range)) return null;

    const match = range.period.match(PERIOD_DAYS_REGEX);
    const days = match ? parseInt(match[0], 10) : DEFAULT_PERIOD_DAYS;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - days);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    return customAnalyticsRange(startDate, endDate);
}

function isNumber(value: unknown): value is number {
    return typeof value === "number";
}

function isList<T>(value: unknown): value is T[] {
    return Array.isArray(value);
}

/** Rejects on HTTP errors and unexpected payloads, so a failure is never shown as "no data". */
async function requestAnalytics<T>(endpoint: string, signal: AbortSignal, isValid: (value: unknown) => value is T): Promise<T> {
    const payload = await requestJson<unknown>(endpoint, {signal});
    if (!isValid(payload)) throw new Error("Unexpected analytics response");
    return payload;
}

/** The comparison is optional: when it fails, the overview still shows, without it. */
async function requestPreviousTotal(range: AnalyticsRange, signal: AbortSignal): Promise<number | null> {
    const previousRange = previousPeriodRange(range);
    if (!previousRange) return null;
    try {
        return await requestAnalytics(buildRangeEndpoint(previousRange), signal, isNumber);
    } catch (error) {
        if (signal.aborted) throw error;
        logger.error("Previous total clicks fetch error", error);
        return null;
    }
}

export async function fetchAnalyticsOverview(range: AnalyticsRange, signal: AbortSignal): Promise<AnalyticsOverview> {
    const [totalClicks, previousTotalClicks, timeSeries] = await Promise.all([
        requestAnalytics(buildRangeEndpoint(range), signal, isNumber),
        requestPreviousTotal(range, signal),
        requestAnalytics(buildGroupedEndpoint(range, "date"), signal, isList<AnalyticsDailyClick>),
    ]);
    return {totalClicks, previousTotalClicks, timeSeries};
}

export function fetchAnalyticsReferrers(range: AnalyticsRange, signal: AbortSignal): Promise<AnalyticsGroupedClick[]> {
    return requestAnalytics(buildGroupedEndpoint(range, "referrer"), signal, isList<AnalyticsGroupedClick>);
}

export function fetchAnalyticsBreakdown(
    range: AnalyticsRange, breakdown: AnalyticsBreakdown, signal: AbortSignal,
): Promise<AnalyticsGroupedClick[]> {
    return requestAnalytics(buildGroupedEndpoint(range, breakdown), signal, isList<AnalyticsGroupedClick>);
}

/** The details only add titles and favicons: when they fail, the top links still show, by id. */
async function addLinkDetails(topLinks: AnalyticsTopLinkClick[], signal: AbortSignal): Promise<AnalyticsTopLink[]> {
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

export async function fetchAnalyticsTopLinks(range: AnalyticsRange, signal: AbortSignal): Promise<AnalyticsTopLink[]> {
    const topLinks = await requestAnalytics(buildGroupedEndpoint(range, "top_link"), signal, isList<AnalyticsTopLinkClick>);
    return addLinkDetails(topLinks, signal);
}
