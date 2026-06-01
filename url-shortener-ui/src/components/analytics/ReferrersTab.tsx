"use client";

import {AnalyticsGroupedClick} from "@/lib/store/analytics";
import {BarLabelProps, HorizontalBarChart} from "@/components/analytics/HorizontalBarChart";
import {LinkFavicon} from "@/components/links/LinkFavicon";
import {Link2} from "lucide-react";
import {Spinner} from "@/components/ui/spinner";
import {CHART_COLORS} from "@/lib/constants";

interface ReferrersTabProps {
    referrers: AnalyticsGroupedClick[];
    isLoading: boolean;
    totalClicks: number;
}

const DIRECT_REFERRER = "(direct)";

export function ReferrersTab({referrers, isLoading, totalClicks}: ReferrersTabProps) {
    if (isLoading && (!referrers || referrers.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-10 opacity-50 h-[250px]">
                <Spinner/>
                <p className="mt-4 text-xs text-muted-foreground">Loading referrers...</p>
            </div>
        );
    }

    if (!referrers || referrers.length === 0) {
        return (
            <div
                className="text-sm text-muted-foreground text-center flex flex-col items-center justify-center h-62.5">
                No referrer data active.
            </div>
        );
    }

    const chartData = referrers.map((r) => ({
        name: r.label,
        clicks: r.clicks,
        rawLabel: r.label,
        hostname: r.hostname,
    }));

    const renderReferrerLabel = (props: BarLabelProps) => {
        const {x, y, height, value} = props;
        const item = chartData.find((d) => d.name === value);
        const isValidHostname = item?.hostname && item.hostname !== DIRECT_REFERRER;

        return (
            <g>
                <foreignObject x={x + 10} y={y} width="100%" height={height}>
                    <div {...{ xmlns: "http://www.w3.org/1999/xhtml" }} className="w-[calc(100%-110px)] h-full flex items-center pr-2 gap-3">
                        {isValidHostname ? (
                            <div
                                className="shrink-0 size-5 flex items-center justify-center rounded-full overflow-hidden bg-muted">
                                <LinkFavicon longUrl={`https://${item.hostname}`}/>
                            </div>
                        ) : (
                            <div className="shrink-0 size-5 flex items-center justify-center rounded-full bg-muted">
                                <Link2 className="size-3.5 text-foreground"/>
                            </div>
                        )}
                        <span
                            className="text-[13px] font-medium text-foreground/90 dark:text-foreground truncate">
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
            color={CHART_COLORS.REFERRERS}
            totalClicks={totalClicks}
            renderLabel={renderReferrerLabel}
        />
    );
}
