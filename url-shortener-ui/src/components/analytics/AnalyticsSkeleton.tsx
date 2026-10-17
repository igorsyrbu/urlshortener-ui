import {
    ANALYTICS_CARD_BODY_HEIGHT_CLASS,
    ANALYTICS_CARD_CLASS,
    ANALYTICS_CARD_HEADER_CLASS,
    ANALYTICS_GRID_CLASS,
    ANALYTICS_PERIOD_ROW_CLASS,
    ANALYTICS_SUMMARY_CARD_CLASS,
} from "@/components/analytics/analytics-layout";
import {cn} from "@/lib/utils";

const SKELETON_BAR_WIDTHS_PERCENT = [75, 55, 40, 25, 15];
const BREAKDOWN_CARD_COUNT = 4;

export function AnalyticsCardSkeleton() {
    return (
        <div className={cn(ANALYTICS_CARD_CLASS, "animate-pulse")}>
            <div className={ANALYTICS_CARD_HEADER_CLASS}>
                <div className="h-5 bg-muted rounded w-24"/>
                <div className="h-5 bg-muted rounded w-10 mr-3"/>
            </div>

            <div className={cn("flex flex-col justify-around", ANALYTICS_CARD_BODY_HEIGHT_CLASS)}>
                {SKELETON_BAR_WIDTHS_PERCENT.map((widthPercent) => (
                    <div key={widthPercent} className="flex items-center justify-between h-9 w-full">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="size-5 rounded-full bg-muted shrink-0"/>
                            <div className="h-3.5 bg-muted rounded w-24 shrink-0"/>
                            <div
                                className="h-6 bg-muted/40 rounded-md hidden sm:block"
                                style={{width: `${widthPercent * 0.6}%`}}
                            />
                        </div>
                        <div className="h-4 bg-muted rounded w-8 shrink-0 mr-3"/>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AnalyticsChartSkeleton() {
    return (
        <div className={cn(ANALYTICS_SUMMARY_CARD_CLASS, "animate-pulse")}>
            <div>
                <div className="h-4 bg-muted rounded w-24"/>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                    <div className="h-10 bg-muted rounded w-48"/>
                    <div className="h-6 bg-muted rounded-full w-24"/>
                </div>
            </div>
            <div className="h-80 sm:h-96 bg-muted/60 rounded-lg w-full mt-4"/>
        </div>
    );
}

/** Rendered inside `PageContainer`, so its rows share the page's gap instead of adding their own spacing. */
export function AnalyticsPageSkeleton() {
    return (
        <>
            <div className={ANALYTICS_PERIOD_ROW_CLASS}>
                <div className="h-10 bg-muted rounded w-44 animate-pulse"/>
            </div>
            <AnalyticsChartSkeleton/>
            <div className={ANALYTICS_GRID_CLASS}>
                {Array.from({length: BREAKDOWN_CARD_COUNT}, (_, index) => <AnalyticsCardSkeleton key={index}/>)}
            </div>
        </>
    );
}
