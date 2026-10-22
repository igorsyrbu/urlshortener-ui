"use client";

import {useEffect} from "react";
import {useShallow} from "zustand/react/shallow";
import {useAnalyticsStore} from "@/lib/store/analytics";
import {DateRange} from "react-day-picker";
import {PeriodSelector} from "@/components/analytics/PeriodSelector";
import {ComparisonBadge} from "@/components/analytics/ComparisonBadge";
import {LazyClicksTimeSeriesChart} from "@/components/analytics/LazyClicksTimeSeriesChart";
import {loadAnalyticsCharts} from "@/components/analytics/load-analytics-charts";
import {PageContainer} from "@/components/layout/PageContainer";
import {AnalyticsBreakdownGrid} from "@/components/analytics/AnalyticsBreakdownGrid";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {AnalyticsPageSkeleton} from "@/components/analytics/AnalyticsSkeleton";
import {ANALYTICS_PERIOD_ROW_CLASS, ANALYTICS_SUMMARY_CARD_CLASS} from "@/components/analytics/analytics-layout";
import {Spinner} from "@/components/ui/spinner";
import {ANALYTICS_COPY, LIST_LOAD_ERROR_CLASS} from "@/lib/constants";
import {cn} from "@/lib/utils";

// A fast refresh would flash the dimming and the spinner on and off; both wait 300 ms (delay-300 delays the opacity
// transition and the spinner's fade-in), so only a slow refresh shows them.
const REFRESHING_DIM_CLASS = "opacity-60 delay-300";
// Desktop only: on phones the period selector fills the row, and a spinner beside it would squeeze it while loading.
const REFRESHING_SPINNER_CLASS = "hidden items-center sm:flex motion-safe:animate-in motion-safe:fade-in motion-safe:delay-300 motion-safe:fill-mode-backwards";

export default function AnalyticsPage() {
    const {
        period,
        setPeriod,
        loadAnalytics,
        retrySection,
        customDateRange,
        setCustomDateRange,
        totalClicks,
        previousTotalClicks,
        timeSeries,
        status,
        overviewLoadedAt,
    } = useAnalyticsStore(useShallow((s) => ({
        period: s.period, setPeriod: s.setPeriod, loadAnalytics: s.loadAnalytics, retrySection: s.retrySection,
        customDateRange: s.customDateRange, setCustomDateRange: s.setCustomDateRange, totalClicks: s.totalClicks,
        previousTotalClicks: s.previousTotalClicks, timeSeries: s.timeSeries, status: s.status,
        overviewLoadedAt: s.overviewLoadedAt,
    })));

    useEffect(() => {
        void loadAnalyticsCharts();
        loadAnalytics();
    }, [loadAnalytics]);

    const hasOverview = overviewLoadedAt !== null;
    const isRefreshing = hasOverview && status.overview === "loading";
    const hasOverviewError = status.overview === "error";

    if (!hasOverview && !hasOverviewError) {
        return (
            <PageContainer>
                <AnalyticsPageSkeleton />
            </PageContainer>
        );
    }

    const handleZoom = (range: DateRange) => {
        setCustomDateRange(range);
    };

    const handleRetryOverview = () => retrySection("overview");
    const refreshingClass = cn("transition-opacity", isRefreshing && REFRESHING_DIM_CLASS);

    return (
        <PageContainer>
            <div className={ANALYTICS_PERIOD_ROW_CLASS}>
                {isRefreshing && (
                    <>
                        <span role="status" className="sr-only">{ANALYTICS_COPY.UPDATING}</span>
                        <span aria-hidden="true" className={REFRESHING_SPINNER_CLASS}>
                            <Spinner size="sm"/>
                        </span>
                    </>
                )}
                <PeriodSelector
                    period={period}
                    customDateRange={customDateRange}
                    onPeriodChange={setPeriod}
                    onCustomDateRangeChange={setCustomDateRange}
                />
            </div>

            {!hasOverview ? (
                <ErrorWithRetry message={ANALYTICS_COPY.LOAD_FAILED} onRetry={handleRetryOverview} className={LIST_LOAD_ERROR_CLASS}/>
            ) : (
                <>
                    {hasOverviewError && (
                        <ErrorWithRetry message={ANALYTICS_COPY.REFRESH_FAILED} onRetry={handleRetryOverview}
                                        className="rounded-xl border-[0.5px] border-border bg-card p-4 sm:flex-row sm:justify-between sm:text-left"/>
                    )}
                    <div aria-busy={isRefreshing}
                         className={cn(ANALYTICS_SUMMARY_CARD_CLASS, refreshingClass)}>
                        <div>
                            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Total Clicks</p>
                            <div className="mt-2 flex flex-wrap items-center gap-4">
                                <h3 className="text-4xl font-extrabold text-foreground">{totalClicks.toLocaleString()}</h3>
                                <ComparisonBadge
                                    period={period}
                                    totalClicks={totalClicks}
                                    previousTotalClicks={previousTotalClicks}
                                />
                            </div>
                        </div>
                        <LazyClicksTimeSeriesChart timeSeries={timeSeries} onZoom={handleZoom}/>
                    </div>

                    <AnalyticsBreakdownGrid className={refreshingClass}/>
                </>
            )}
        </PageContainer>
    );
}
