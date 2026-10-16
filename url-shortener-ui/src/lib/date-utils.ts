import {FIRST_ANALYTICS_YEAR} from "@/lib/constants";

export function getSelectableAnalyticsYears(currentYear: number): number[] {
    const lastYear = Math.max(currentYear, FIRST_ANALYTICS_YEAR);
    return Array.from({length: lastYear - FIRST_ANALYTICS_YEAR + 1}, (_, index) => FIRST_ANALYTICS_YEAR + index);
}
