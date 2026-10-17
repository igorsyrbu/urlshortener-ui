"use client";

import dynamic from "next/dynamic";
import {loadAnalyticsCharts} from "@/components/analytics/load-analytics-charts";

export const LazyClicksTimeSeriesChart = dynamic(
    () => loadAnalyticsCharts().then((charts) => charts.ClicksTimeSeriesChart),
    {ssr: false, loading: () => <div className="h-80 sm:h-96 mt-4 w-full" aria-hidden="true"/>},
);
