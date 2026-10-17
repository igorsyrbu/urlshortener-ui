"use client";

import {useEffect} from "react";
import {useAnalyticsStore} from "@/lib/store/analytics";
import {DateRange} from "react-day-picker";
import {PeriodSelector} from "@/components/analytics/PeriodSelector";
import {ComparisonBadge} from "@/components/analytics/ComparisonBadge";
import {ClicksTimeSeriesChart} from "@/components/analytics/ClicksTimeSeriesChart";
import {PageContainer} from "@/components/layout/PageContainer";
import {AnalyticsBreakdownGrid} from "@/components/analytics/AnalyticsBreakdownGrid";
import {AnalyticsError} from "@/components/analytics/AnalyticsError";
import {AnalyticsPageSkeleton} from "@/components/analytics/AnalyticsSkeleton";
import {Spinner} from "@/components/ui/spinner";
import {ANALYTICS_COPY} from "@/lib/constants";
import {cn} from "@/lib/utils";

const LOAD_ERROR_CLASS = "rounded-xl border-[0.5px] border-border bg-card p-10";
// A fast refresh would flash the dimming and the spinner on and off; both wait 300 ms (delay-300 delays the opacity
// transition and the spinner's fade-in), so only a slow refresh shows them.
const REFRESHING_DIM_CLASS = "opacity-60 delay-300";
const REFRESHING_SPINNER_CLASS = "flex items-center motion-safe:animate-in motion-safe:fade-in motion-safe:delay-300 motion-safe:fill-mode-backwards";

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
    } = useAnalyticsStore();

    useEffect(() => {
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
            <div className="flex min-h-10 items-center justify-end gap-3">
                {isRefreshing && (
                    <span role="status" className={REFRESHING_SPINNER_CLASS}>
                        <Spinner size="sm"/>
                        <span className="sr-only">{ANALYTICS_COPY.UPDATING}</span>
                    </span>
                )}
                <PeriodSelector
                    period={period}
                    customDateRange={customDateRange}
                    onPeriodChange={setPeriod}
                    onCustomDateRangeChange={setCustomDateRange}
                />
            </div>

            {!hasOverview ? (
                <AnalyticsError message={ANALYTICS_COPY.LOAD_FAILED} onRetry={handleRetryOverview} className={LOAD_ERROR_CLASS}/>
            ) : (
                <>
                    {hasOverviewError && (
                        <AnalyticsError message={ANALYTICS_COPY.REFRESH_FAILED} onRetry={handleRetryOverview}
                                        className="rounded-xl border-[0.5px] border-border bg-card p-4 sm:flex-row sm:justify-between sm:text-left"/>
                    )}
                    <div aria-busy={isRefreshing}
                         className={cn("flex flex-col gap-6 rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6", refreshingClass)}>
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
                        <ClicksTimeSeriesChart timeSeries={timeSeries} onZoom={handleZoom}/>
                    </div>

                    <AnalyticsBreakdownGrid className={refreshingClass}/>
                </>
            )}
        </PageContainer>
    );
}
