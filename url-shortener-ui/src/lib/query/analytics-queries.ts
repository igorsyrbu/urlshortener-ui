import {queryOptions} from "@tanstack/react-query";
import {
    type AnalyticsBreakdown,
    type AnalyticsRange,
    fetchAnalyticsBreakdown,
    fetchAnalyticsOverview,
    fetchAnalyticsReferrers,
    fetchAnalyticsTopLinks,
} from "@/lib/analytics-api";
import {logger} from "@/lib/logger";
import {queryKeys} from "@/lib/query/query-keys";

/** Clicks keep arriving, but numbers younger than a minute are not refetched when the page is opened again. */
export const ANALYTICS_STALE_TIME_MS = 60_000;

/** A range viewed earlier in the session shows at once (refreshing if stale) instead of a skeleton. */
const ANALYTICS_GC_TIME_MS = 30 * 60_000;

const ANALYTICS_CACHING = {staleTime: ANALYTICS_STALE_TIME_MS, gcTime: ANALYTICS_GC_TIME_MS};

async function logFailure<T>(message: string, signal: AbortSignal, request: Promise<T>): Promise<T> {
    try {
        return await request;
    } catch (error) {
        if (!signal.aborted) logger.error(message, error);
        throw error;
    }
}

export function analyticsOverviewQueryOptions(range: AnalyticsRange) {
    return queryOptions({
        queryKey: queryKeys.analytics.overview(range),
        queryFn: ({signal}) => logFailure("Analytics overview fetch error", signal, fetchAnalyticsOverview(range, signal)),
        ...ANALYTICS_CACHING,
    });
}

export function analyticsReferrersQueryOptions(range: AnalyticsRange) {
    return queryOptions({
        queryKey: queryKeys.analytics.referrers(range),
        queryFn: ({signal}) => logFailure("Referrers fetch error", signal, fetchAnalyticsReferrers(range, signal)),
        ...ANALYTICS_CACHING,
    });
}

/** The top links and their link details, loaded together so the card never shows one period's links with another's. */
export function analyticsTopLinksQueryOptions(range: AnalyticsRange) {
    return queryOptions({
        queryKey: queryKeys.analytics.topLinks(range),
        queryFn: ({signal}) => logFailure("Top links fetch error", signal, fetchAnalyticsTopLinks(range, signal)),
        ...ANALYTICS_CACHING,
    });
}

export function analyticsBreakdownQueryOptions(breakdown: AnalyticsBreakdown, range: AnalyticsRange) {
    return queryOptions({
        queryKey: queryKeys.analytics.breakdown(breakdown, range),
        queryFn: ({signal}) => logFailure(`Analytics ${breakdown} breakdown fetch error`, signal,
            fetchAnalyticsBreakdown(range, breakdown, signal)),
        ...ANALYTICS_CACHING,
    });
}
