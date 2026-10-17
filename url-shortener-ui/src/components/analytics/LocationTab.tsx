"use client";

import {ANALYTICS_CARD_BODY_HEIGHT_CLASS} from "@/components/analytics/analytics-layout";
import {cn} from "@/lib/utils";
import {AnalyticsGroupedClick} from "@/lib/store/analytics";
import type {BarLabelProps} from "@/components/analytics/HorizontalBarChart";
import {LazyHorizontalBarChart} from "@/components/analytics/LazyHorizontalBarChart";
import {getCountryName, LocationIcon} from "@/components/analytics/LocationIcon";
import {Spinner} from "@/components/ui/spinner";
import {ANALYTICS_VISIBLE_ROWS, CHART_COLORS} from "@/lib/constants";

interface LocationTabProps {
    locationTab: "countries" | "continents";
    data: AnalyticsGroupedClick[];
    isLoading: boolean;
    totalClicks: number;
}

export function LocationTab({locationTab, data, isLoading, totalClicks}: LocationTabProps) {
    if (isLoading && (!data || data.length === 0)) {
        return (
            <div className={cn("flex flex-col gap-4 py-4 w-full items-center justify-center", ANALYTICS_CARD_BODY_HEIGHT_CLASS)}>
                <Spinner/>
                <span className="text-xs text-muted-foreground mr-1">Loading {locationTab}...</span>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div
                className={cn("text-sm text-muted-foreground text-center flex flex-col items-center justify-center", ANALYTICS_CARD_BODY_HEIGHT_CLASS)}>
                No location data available for this period.
            </div>
        );
    }

    const sortedData = [...data].sort((a, b) => b.clicks - a.clicks).slice(0, ANALYTICS_VISIBLE_ROWS);

    const chartData = sortedData.map((d) => ({
        name: locationTab === "countries" ? getCountryName(d.label) : d.label,
        clicks: d.clicks,
        rawLabel: d.label,
    }));

    const isCountry = locationTab === "countries";

    const renderLocationLabel = (props: BarLabelProps) => {
        const {x, y, height, value} = props;
        const item = chartData.find((d) => d.name === value);

        return (
            <g>
                <foreignObject x={x + 10} y={y} width="100%" height={height}>
                    <div {...{ xmlns: "http://www.w3.org/1999/xhtml" }} className="w-[calc(100%-110px)] h-full flex items-center pr-2 gap-3">
                        <LocationIcon label={item?.rawLabel || ""} isCountry={isCountry}/>
                        <span className="text-[13px] font-medium text-foreground/90 dark:text-foreground truncate">
                            {value}
                        </span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <LazyHorizontalBarChart
            data={chartData}
            color={CHART_COLORS.LOCATIONS}
            totalClicks={totalClicks}
            renderLabel={renderLocationLabel}
        />
    );
}
