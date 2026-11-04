"use client";

import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import type {AnalyticsOverview, AnalyticsRange} from "@/lib/analytics-api";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";
import {analyticsOverviewQueryOptions} from "@/lib/query/analytics-queries";

interface AnalyticsOverviewState {
    /** The range's numbers, or the last ones shown while a new range loads or after it failed; `undefined` before any. */
    overview: AnalyticsOverview | undefined;
    /** A new range is loading while the previous numbers stay on screen. */
    isRefreshing: boolean;
    /** The new range failed; `overview` still holds the previous numbers. */
    hasRefreshFailed: boolean;
    /** Nothing has loaded yet and the range failed. */
    hasLoadFailed: boolean;
    retry: () => void;
}

/**
 * The summary card's numbers. A failed background refresh of the same range keeps its numbers silently (it is logged);
 * only a range the user picked and could not get is reported.
 */
export function useAnalyticsOverview(range: AnalyticsRange): AnalyticsOverviewState {
    const {data, isFetching, isError, refetch} = useQuery(analyticsOverviewQueryOptions(range));
    const [lastOverview, setLastOverview] = useState(data);
    useOnValueChange(data, (overview) => {
        if (overview) setLastOverview(overview);
    });

    const isMissing = data === undefined;
    const hasFailed = isMissing && isError && !isFetching;
    return {
        overview: data ?? lastOverview,
        isRefreshing: isMissing && isFetching && lastOverview !== undefined,
        hasRefreshFailed: hasFailed && lastOverview !== undefined,
        hasLoadFailed: hasFailed && lastOverview === undefined,
        retry: () => void refetch(),
    };
}
