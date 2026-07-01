"use client";

import {useEffect} from "react";
import {useAnalyticsStore} from "@/lib/store/analytics";
import {TooltipProvider} from "@/components/ui/tooltip";
import {DateRange} from "react-day-picker";
import {PeriodSelector} from "@/components/analytics/PeriodSelector";
import {ComparisonBadge} from "@/components/analytics/ComparisonBadge";
import {ClicksTimeSeriesChart} from "@/components/analytics/ClicksTimeSeriesChart";
import {TopLinksTab} from "@/components/analytics/TopLinksTab";
import {ReferrersTab} from "@/components/analytics/ReferrersTab";
import {LocationTab} from "@/components/analytics/LocationTab";
import {DeviceTab} from "@/components/analytics/DeviceTab";
import {PageContainer} from "@/components/layout/PageContainer";
import {AnalyticsCard} from "@/components/analytics/AnalyticsCard";
import {AnalyticsPageSkeleton} from "@/components/analytics/AnalyticsSkeleton";

export default function AnalyticsPage() {
    const {
        period,
        setPeriod,
        fetchAnalytics,
        customDateRange,
        setCustomDateRange,
        totalClicks,
        previousTotalClicks,
        timeSeries,
        countries,
        continents,
        devices,
        os,
        referrers,
        topLinks,
        loading,
        isLocationLoading,
        isDeviceLoading,
        locationTab,
        deviceTab,
        setLocationTab,
        setDeviceTab,
    } = useAnalyticsStore();

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (loading && timeSeries.length === 0) {
        return (
            <PageContainer>
                <AnalyticsPageSkeleton />
            </PageContainer>
        );
    }

    const handleZoom = (range: DateRange) => {
        setCustomDateRange(range);
    };

    const locationData = locationTab === "countries" ? countries : continents;
    const deviceData = deviceTab === "devices" ? devices : os;

    return (
        <PageContainer>
            <div className="flex min-h-10 items-center justify-end">
                <PeriodSelector
                    period={period}
                    customDateRange={customDateRange}
                    onPeriodChange={setPeriod}
                    onCustomDateRangeChange={setCustomDateRange}
                />
            </div>

            <div className="flex flex-col gap-6 rounded-xl border-[0.5px] border-border bg-background p-4 sm:p-6">
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

            <div className="md:mt-2 grid grid-cols-1 gap-y-4 md:gap-y-6 gap-x-4 md:grid-cols-2 md:gap-x-5">
                <AnalyticsCard title="Top Links">
                    <TopLinksTab topLinks={topLinks} isLoading={loading} totalClicks={totalClicks}/>
                </AnalyticsCard>

                <AnalyticsCard title="Referrers">
                    <ReferrersTab referrers={referrers} isLoading={loading} totalClicks={totalClicks}/>
                </AnalyticsCard>

                <AnalyticsCard
                    tabs={[
                        {label: "Countries", value: "countries", isActive: locationTab === "countries"},
                        {label: "Continents", value: "continents", isActive: locationTab === "continents"},
                    ]}
                    onTabChange={(tab) => setLocationTab(tab as "countries" | "continents")}
                >
                    <TooltipProvider>
                        <LocationTab
                            locationTab={locationTab}
                            data={locationData}
                            isLoading={isLocationLoading}
                            totalClicks={totalClicks}
                        />
                    </TooltipProvider>
                </AnalyticsCard>

                <AnalyticsCard
                    tabs={[
                        {label: "Devices", value: "devices", isActive: deviceTab === "devices"},
                        {label: "OS", value: "os", isActive: deviceTab === "os"},
                    ]}
                    onTabChange={(tab) => setDeviceTab(tab as "devices" | "os")}
                >
                    <DeviceTab
                        deviceTab={deviceTab}
                        data={deviceData}
                        isLoading={isDeviceLoading}
                        totalClicks={totalClicks}
                    />
                </AnalyticsCard>
            </div>
        </PageContainer>
    );
}
