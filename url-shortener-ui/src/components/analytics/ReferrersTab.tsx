"use client";

import {AnalyticsGroupedClick} from "@/lib/store/analytics";
import {BarLabelProps, HorizontalBarChart} from "@/components/analytics/HorizontalBarChart";
import {LinkFavicon} from "@/components/links/LinkFavicon";
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
                {!isValidHostname && (
                    <g transform={`translate(${x + 10}, ${y + (height - 20) / 2})`}>
                        <rect width={20} height={20} rx={10} fill="hsl(var(--muted))"/>
                        <text
                            x={10}
                            y={10}
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="material-symbols-outlined fill-primary text-[14px]"
                        >
                            {"link"}
                        </text>
                    </g>
                )}
                <foreignObject x={x + 10} y={y} width="calc(100% - 92px)" height={height}>
                    <div className="w-full h-full flex items-center pr-2 gap-3">
                        {isValidHostname && (
                            <div
                                className="shrink-0 size-5 flex items-center justify-center rounded-full overflow-hidden bg-muted">
                                <LinkFavicon longUrl={`https://${item.hostname}`}/>
                            </div>
                        )}
                        <span
                            className={`text-[13px] font-medium text-foreground/90 dark:text-foreground truncate ${isValidHostname ? "" : "pl-7"}`}>
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
