import type * as AnalyticsCharts from "@/components/analytics/analytics-charts";

/** Starts (or reuses) the download of the chart chunk; the page calls it on mount so it loads during the skeleton. */
export function loadAnalyticsCharts(): Promise<typeof AnalyticsCharts> {
    return import("@/components/analytics/analytics-charts");
}
