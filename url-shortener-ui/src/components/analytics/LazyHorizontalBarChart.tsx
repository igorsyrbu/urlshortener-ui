"use client";

import dynamic from "next/dynamic";
import {ANALYTICS_CARD_BODY_HEIGHT_CLASS} from "@/components/analytics/analytics-layout";
import {loadAnalyticsCharts} from "@/components/analytics/load-analytics-charts";

export const LazyHorizontalBarChart = dynamic(
    () => loadAnalyticsCharts().then((charts) => charts.HorizontalBarChart),
    {ssr: false, loading: () => <div className={ANALYTICS_CARD_BODY_HEIGHT_CLASS} aria-hidden="true"/>},
);
