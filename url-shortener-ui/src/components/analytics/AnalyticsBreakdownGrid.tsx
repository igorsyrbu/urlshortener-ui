"use client";

import React from "react";
import {TooltipProvider} from "@/components/ui/tooltip";
import {AnalyticsCard} from "@/components/analytics/AnalyticsCard";
import {ANALYTICS_CARD_BODY_HEIGHT_CLASS, ANALYTICS_GRID_CLASS} from "@/components/analytics/analytics-layout";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {DeviceTab} from "@/components/analytics/DeviceTab";
import {LocationTab} from "@/components/analytics/LocationTab";
import {ReferrersTab} from "@/components/analytics/ReferrersTab";
import {TopLinksTab} from "@/components/analytics/TopLinksTab";
import {ANALYTICS_COPY} from "@/lib/constants";
import {
    type AnalyticsSection,
    type DeviceTab as DeviceTabValue,
    type LocationTab as LocationTabValue,
    type SectionStatus,
    useAnalyticsStore,
} from "@/lib/store/analytics";
import {cn} from "@/lib/utils";

interface AnalyticsBreakdownGridProps {
    className?: string;
}

/** Before a section's first answer (`idle`) it shows its spinner, never "no data". */
function isSectionPending(status: SectionStatus): boolean {
    return status === "idle" || status === "loading";
}

function isLocationTab(value: string): value is LocationTabValue {
    return value === "countries" || value === "continents";
}

function isDeviceTab(value: string): value is DeviceTabValue {
    return value === "devices" || value === "os";
}

export function AnalyticsBreakdownGrid({className}: AnalyticsBreakdownGridProps) {
    const {
        totalClicks, topLinks, referrers, countries, continents, devices, os,
        status, locationTab, deviceTab, setLocationTab, setDeviceTab, retrySection,
    } = useAnalyticsStore();

    function renderSection(section: AnalyticsSection, content: React.ReactNode): React.ReactNode {
        if (status[section] !== "error") return content;
        return (
            <ErrorWithRetry message={ANALYTICS_COPY.SECTION_FAILED} onRetry={() => retrySection(section)}
                            className={ANALYTICS_CARD_BODY_HEIGHT_CLASS}/>
        );
    }

    return (
        <div className={cn(ANALYTICS_GRID_CLASS, className)}>
            <AnalyticsCard title="Top Links">
                {renderSection("topLinks",
                    <TopLinksTab topLinks={topLinks} isLoading={isSectionPending(status.topLinks)} totalClicks={totalClicks}/>)}
            </AnalyticsCard>

            <AnalyticsCard title="Referrers">
                <ReferrersTab referrers={referrers} isLoading={isSectionPending(status.overview)} totalClicks={totalClicks}/>
            </AnalyticsCard>

            <AnalyticsCard
                tabs={[
                    {label: "Countries", value: "countries", isActive: locationTab === "countries"},
                    {label: "Continents", value: "continents", isActive: locationTab === "continents"},
                ]}
                onTabChange={(tab) => isLocationTab(tab) && setLocationTab(tab)}
            >
                {renderSection("location",
                    <TooltipProvider>
                        <LocationTab locationTab={locationTab} data={locationTab === "countries" ? countries : continents}
                                     isLoading={isSectionPending(status.location)} totalClicks={totalClicks}/>
                    </TooltipProvider>)}
            </AnalyticsCard>

            <AnalyticsCard
                tabs={[
                    {label: "Devices", value: "devices", isActive: deviceTab === "devices"},
                    {label: "OS", value: "os", isActive: deviceTab === "os"},
                ]}
                onTabChange={(tab) => isDeviceTab(tab) && setDeviceTab(tab)}
            >
                {renderSection("device",
                    <DeviceTab deviceTab={deviceTab} data={deviceTab === "devices" ? devices : os}
                               isLoading={isSectionPending(status.device)} totalClicks={totalClicks}/>)}
            </AnalyticsCard>
        </div>
    );
}
