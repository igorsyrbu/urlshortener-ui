"use client";

import {AnalyticsGroupedClick} from "@/lib/store/analytics";
import {BarLabelProps, HorizontalBarChart} from "@/components/analytics/HorizontalBarChart";
import {Spinner} from "@/components/ui/spinner";
import {CHART_COLORS} from "@/lib/constants";

interface DeviceTabProps {
    deviceTab: "devices" | "os";
    data: AnalyticsGroupedClick[];
    isLoading: boolean;
    totalClicks: number;
}

function getDeviceIconPath(value: string, isOS: boolean): string {
    const name = value.toLowerCase();

    if (isOS) {
        if (name.includes("windows")) return "/icons/windows.png";
        if (name.includes("mac")) return "/icons/macos.png";
        if (name.includes("linux")) return "/icons/linux.png";
        if (name.includes("ios")) return "/icons/ios.png";
        if (name.includes("android")) return "/icons/android.png";
        if (name.includes("other")) return "/icons/other.png";
        return "/icons/unknown.png";
    }

    if (name === "desktop") return "/icons/desktop.png";
    if (name === "mobile") return "/icons/mobile.png";
    if (name === "other") return "/icons/other.png";
    return "/icons/unknown.png";
}

export function DeviceTab({deviceTab, data, isLoading, totalClicks}: DeviceTabProps) {
    const isOS = deviceTab === "os";

    if (isLoading && (!data || data.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-10 opacity-50 h-[250px]">
                <Spinner/>
                <p className="mt-4 text-xs text-muted-foreground">Loading {deviceTab}...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-62.5 opacity-50">
                <div className="relative size-32 rounded-full border-12 border-muted"/>
                <p className="mt-4 text-xs text-muted-foreground">No traffic to display.</p>
            </div>
        );
    }

    const color = isOS ? CHART_COLORS.OS : CHART_COLORS.DEVICES;

    const chartData = data.map((item) => ({
        name: item.label,
        clicks: item.clicks,
        rawLabel: item.label,
    }));

    const renderDeviceLabel = (props: BarLabelProps) => {
        const {x, y, height, value} = props;
        const iconHref = getDeviceIconPath(value, isOS);

        return (
            <g>
                <foreignObject x={x + 10} y={y} width="calc(100% - 92px)" height={height}>
                    <div className="w-full h-full flex items-center pr-2 gap-3">
                        <div className="shrink-0 size-5 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={iconHref}
                                alt={value}
                                className="size-full object-contain dark:invert"
                            />
                        </div>
                        <span className="text-[13px] font-medium text-foreground/90 dark:text-foreground truncate">
                            {value}
                        </span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <HorizontalBarChart
            data={chartData}
            color={color}
            totalClicks={totalClicks}
            renderLabel={renderDeviceLabel}
        />
    );
}
