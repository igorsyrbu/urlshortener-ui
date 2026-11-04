"use client";

import {keepPreviousData, type Query, useQuery, type UseQueryResult} from "@tanstack/react-query";
import type {AnalyticsBreakdown, AnalyticsGroupedClick, AnalyticsRange, AnalyticsTopLink} from "@/lib/analytics-api";
import {
    analyticsBreakdownQueryOptions,
    analyticsReferrersQueryOptions,
    analyticsTopLinksQueryOptions,
} from "@/lib/query/analytics-queries";
import {queryKeys} from "@/lib/query/query-keys";

const NO_ROWS: never[] = [];

interface AnalyticsSection<T> {
    rows: T[];
    /** True until the section's first answer for the range; the previous range's rows stay on screen meanwhile. */
    isLoading: boolean;
    /** The range failed and there is nothing to show; a failed background refresh keeps its rows silently. */
    hasFailed: boolean;
    retry: () => void;
}

function toSection<T>({data, isPending, isFetching, isError, refetch}: UseQueryResult<T[]>): AnalyticsSection<T> {
    const isMissing = data === undefined;
    return {
        rows: data ?? NO_ROWS,
        isLoading: isMissing && (isPending || isFetching),
        hasFailed: isMissing && isError && !isFetching,
        retry: () => void refetch(),
    };
}

export function useAnalyticsReferrers(range: AnalyticsRange): AnalyticsSection<AnalyticsGroupedClick> {
    return toSection(useQuery({...analyticsReferrersQueryOptions(range), placeholderData: keepPreviousData}));
}

export function useAnalyticsTopLinks(range: AnalyticsRange): AnalyticsSection<AnalyticsTopLink> {
    return toSection(useQuery({...analyticsTopLinksQueryOptions(range), placeholderData: keepPreviousData}));
}

type BreakdownQuery = Query<AnalyticsGroupedClick[], Error, AnalyticsGroupedClick[], ReturnType<typeof queryKeys.analytics.breakdown>>;

/** Another period's rows of the same breakdown may stay while it loads; another tab's rows (countries for continents) may not. */
function previousRowsOfSameBreakdown(breakdown: AnalyticsBreakdown) {
    return (previousRows: AnalyticsGroupedClick[] | undefined, previousQuery: BreakdownQuery | undefined) =>
        previousQuery?.queryKey[2] === breakdown ? previousRows : undefined;
}

/** Only the selected tab's breakdown is requested: the other tab loads when it is opened. */
export function useAnalyticsBreakdown(breakdown: AnalyticsBreakdown, range: AnalyticsRange): AnalyticsSection<AnalyticsGroupedClick> {
    return toSection(useQuery({
        ...analyticsBreakdownQueryOptions(breakdown, range),
        placeholderData: previousRowsOfSameBreakdown(breakdown),
    }));
}
