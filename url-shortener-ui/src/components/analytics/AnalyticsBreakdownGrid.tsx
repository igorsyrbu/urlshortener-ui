"use client";

import React from "react";
import {useShallow} from "zustand/react/shallow";
import {TooltipProvider} from "@/components/ui/tooltip";
import {AnalyticsCard} from "@/components/analytics/AnalyticsCard";
import {ANALYTICS_CARD_BODY_HEIGHT_CLASS, ANALYTICS_GRID_CLASS} from "@/components/analytics/analytics-layout";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {DeviceTab} from "@/components/analytics/DeviceTab";
import {LocationTab} from "@/components/analytics/LocationTab";
import {ReferrersTab} from "@/components/analytics/ReferrersTab";
import {TopLinksTab} from "@/components/analytics/TopLinksTab";
import {ANALYTICS_COPY} from "@/lib/constants";
import type {AnalyticsBreakdown, AnalyticsRange} from "@/lib/analytics-api";
import {useAnalyticsBreakdown, useAnalyticsReferrers, useAnalyticsTopLinks} from "@/lib/hooks/useAnalyticsSections";
import {
    type DeviceTab as DeviceTabValue,
    type LocationTab as LocationTabValue,
    useAnalyticsStore,
} from "@/lib/store/analytics";
import {cn} from "@/lib/utils";

interface AnalyticsBreakdownGridProps {
    range: AnalyticsRange;
    /** Each bar's share is measured against the range's total. */
    totalClicks: number;
    className?: string;
}

const LOCATION_BREAKDOWNS: Record<LocationTabValue, AnalyticsBreakdown> = {countries: "country", continents: "continent"};
const DEVICE_BREAKDOWNS: Record<DeviceTabValue, AnalyticsBreakdown> = {devices: "device", os: "os"};

function isLocationTab(value: string): value is LocationTabValue {
    return value === "countries" || value === "continents";
}

function isDeviceTab(value: string): value is DeviceTabValue {
    return value === "devices" || value === "os";
}

interface SectionFailure {
    hasFailed: boolean;
    retry: () => void;
}

function renderSection({hasFailed, retry}: SectionFailure, content: React.ReactNode): React.ReactNode {
    if (!hasFailed) return content;
    return <ErrorWithRetry message={ANALYTICS_COPY.SECTION_FAILED} onRetry={retry} className={ANALYTICS_CARD_BODY_HEIGHT_CLASS}/>;
}

export function AnalyticsBreakdownGrid({range, totalClicks, className}: AnalyticsBreakdownGridProps) {
    const {locationTab, deviceTab, setLocationTab, setDeviceTab} = useAnalyticsStore(useShallow((s) => ({
        locationTab: s.locationTab, deviceTab: s.deviceTab, setLocationTab: s.setLocationTab, setDeviceTab: s.setDeviceTab,
    })));
    const topLinks = useAnalyticsTopLinks(range);
    const referrers = useAnalyticsReferrers(range);
    const location = useAnalyticsBreakdown(LOCATION_BREAKDOWNS[locationTab], range);
    const device = useAnalyticsBreakdown(DEVICE_BREAKDOWNS[deviceTab], range);

    return (
        <div className={cn(ANALYTICS_GRID_CLASS, className)}>
            <AnalyticsCard title="Top Links">
                {renderSection(topLinks,
                    <TopLinksTab topLinks={topLinks.rows} isLoading={topLinks.isLoading} totalClicks={totalClicks}/>)}
            </AnalyticsCard>

            <AnalyticsCard title="Referrers">
                {renderSection(referrers,
                    <ReferrersTab referrers={referrers.rows} isLoading={referrers.isLoading} totalClicks={totalClicks}/>)}
            </AnalyticsCard>

            <AnalyticsCard
                tabs={[
                    {label: "Countries", value: "countries", isActive: locationTab === "countries"},
                    {label: "Continents", value: "continents", isActive: locationTab === "continents"},
                ]}
                onTabChange={(tab) => isLocationTab(tab) && setLocationTab(tab)}
            >
                {renderSection(location,
                    <TooltipProvider>
                        <LocationTab locationTab={locationTab} data={location.rows} isLoading={location.isLoading}
                                     totalClicks={totalClicks}/>
                    </TooltipProvider>)}
            </AnalyticsCard>

            <AnalyticsCard
                tabs={[
                    {label: "Devices", value: "devices", isActive: deviceTab === "devices"},
                    {label: "OS", value: "os", isActive: deviceTab === "os"},
                ]}
                onTabChange={(tab) => isDeviceTab(tab) && setDeviceTab(tab)}
            >
                {renderSection(device,
                    <DeviceTab deviceTab={deviceTab} data={device.rows} isLoading={device.isLoading} totalClicks={totalClicks}/>)}
            </AnalyticsCard>
        </div>
    );
}
