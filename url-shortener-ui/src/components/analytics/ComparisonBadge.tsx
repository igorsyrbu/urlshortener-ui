import {TrendingDown, TrendingUp} from "lucide-react";

interface ComparisonBadgeProps {
    period: string;
    totalClicks: number;
    previousTotalClicks: number | null;
}

const PERIOD_DAYS_REGEX = /\d+/;
const DEFAULT_DAYS_LABEL = "30";
const PERCENTAGE_MULTIPLIER = 100;

export function ComparisonBadge({
                                    period,
                                    totalClicks,
                                    previousTotalClicks,
                                }: ComparisonBadgeProps) {
    if (period === "custom" || previousTotalClicks === null) return null;

    let percent: number;
    let isPositive: boolean;

    if (previousTotalClicks === 0) {
        percent = totalClicks > 0 ? PERCENTAGE_MULTIPLIER : 0;
        isPositive = totalClicks >= 0;
    } else {
        percent = ((totalClicks - previousTotalClicks) / previousTotalClicks) * PERCENTAGE_MULTIPLIER;
        isPositive = percent >= 0;
    }

    const formattedPercent = (percent > 0 ? "+" : "") + percent.toFixed(1) + "%";
    const daysMatches = period.match(PERIOD_DAYS_REGEX);
    const days = daysMatches ? daysMatches[0] : DEFAULT_DAYS_LABEL;

    const badgeClasses = isPositive
        ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
        : "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";

    return (
        <div className="flex items-center gap-3">
            <div
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-semibold border ${badgeClasses}`}>
                {isPositive ? (
                    <TrendingUp className="size-4" />
                ) : (
                    <TrendingDown className="size-4" />
                )}
                <span>{formattedPercent}</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                vs last {days} days
            </span>
        </div>
    );
}
