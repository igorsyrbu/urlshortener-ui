"use client";

import {ANALYTICS_CARD_BODY_HEIGHT_CLASS} from "@/components/analytics/analytics-layout";
import {cn} from "@/lib/utils";
import type {BarLabelProps} from "@/components/analytics/HorizontalBarChart";
import {LazyHorizontalBarChart} from "@/components/analytics/LazyHorizontalBarChart";
import {CappedRows} from "@/components/analytics/CappedRows";
import {LinkFavicon} from "@/components/links/LinkFavicon";
import {Spinner} from "@/components/ui/spinner";
import {FaviconPlaceholder} from "@/components/icons/FaviconPlaceholder";
import {CHART_COLORS} from "@/lib/constants";
import {LinkItem} from "@/lib/types";

interface TopLinkData {
    shortLinkId: string;
    clicks: number;
    details?: LinkItem;
}

interface TopLinksTabProps {
    topLinks: TopLinkData[];
    isLoading: boolean;
    totalClicks: number;
}

export function TopLinksTab({topLinks, isLoading, totalClicks}: TopLinksTabProps) {
    if (isLoading && (!topLinks || topLinks.length === 0)) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-10 opacity-50", ANALYTICS_CARD_BODY_HEIGHT_CLASS)}>
                <Spinner/>
                <p className="mt-4 text-xs text-muted-foreground">Loading top links...</p>
            </div>
        );
    }

    if (!topLinks || topLinks.length === 0) {
        return (
            <div
                className={cn("text-sm text-muted-foreground text-center flex flex-col items-center justify-center", ANALYTICS_CARD_BODY_HEIGHT_CLASS)}>
                No top links data available.
            </div>
        );
    }

    const sortedData = [...topLinks].sort((a, b) => b.clicks - a.clicks);

    const chartData = sortedData.map((link) => ({
        name: link.details?.shortUrl || link.shortLinkId,
        clicks: link.clicks,
        rawLabel: link.shortLinkId,
        longUrl: link.details?.longUrl,
    }));

    const renderLinkLabel = (props: BarLabelProps) => {
        const {x, y, height, value} = props;
        const item = chartData.find((d) => d.name === value);

        return (
            <g>
                {!item?.longUrl && (
                    <g transform={`translate(${x + 10}, ${y + (height - 20) / 2})`}>
                        <FaviconPlaceholder/>
                    </g>
                )}
                <foreignObject x={x + 10} y={y} width="100%" height={height}>
                    <div {...{ xmlns: "http://www.w3.org/1999/xhtml" }} className="w-[calc(100%-110px)] h-full flex items-center pr-2 gap-3">
                        {item?.longUrl && (
                            <div
                                className="shrink-0 size-5 flex items-center justify-center rounded-full overflow-hidden bg-muted">
                                <LinkFavicon longUrl={item.longUrl}/>
                            </div>
                        )}
                        <span
                            className={`text-[13px] font-medium text-foreground/90 dark:text-foreground truncate ${item?.longUrl ? "" : "pl-7"}`}>
                            {value}
                        </span>
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <CappedRows rows={chartData}>
            {(visibleRows) => (
                <LazyHorizontalBarChart
                    data={visibleRows}
                    color={CHART_COLORS.TOP_LINKS}
                    totalClicks={totalClicks}
                    renderLabel={renderLinkLabel}
                />
            )}
        </CappedRows>
    );
}
