"use client";

import React from "react";
import {TooltipProvider} from "@/components/ui/tooltip";
import {AnalyticsCard} from "@/components/analytics/AnalyticsCard";
import {AnalyticsError} from "@/components/analytics/AnalyticsError";
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

const SECTION_ERROR_CLASS = "h-62.5";

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
            <AnalyticsError message={ANALYTICS_COPY.SECTION_FAILED} onRetry={() => retrySection(section)}
                            className={SECTION_ERROR_CLASS}/>
        );
    }

    return (
        <div className={cn("md:mt-2 grid grid-cols-1 gap-y-4 md:gap-y-6 gap-x-4 md:grid-cols-2 md:gap-x-5", className)}>
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
