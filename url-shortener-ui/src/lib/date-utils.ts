import {FIRST_ANALYTICS_YEAR} from "@/lib/constants";
import {formatShortDate} from "@/lib/format";

export function getSelectableAnalyticsYears(currentYear: number): number[] {
    const lastYear = Math.max(currentYear, FIRST_ANALYTICS_YEAR);
    return Array.from({length: lastYear - FIRST_ANALYTICS_YEAR + 1}, (_, index) => FIRST_ANALYTICS_YEAR + index);
}

const DATE_PART_LENGTH = 2;
// Date months are 0-based; ISO 8601 months are 1-based.
const MONTH_NUMBER_OFFSET = 1;

export function getTodayAtMidnight(now: Date = new Date()): Date {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return today;
}

/** Formats the local calendar date as `YYYY-MM-DD` (unlike `toISOString`, which uses UTC). */
export function formatLocalIsoDate(date: Date): string {
    const month = String(date.getMonth() + MONTH_NUMBER_OFFSET).padStart(DATE_PART_LENGTH, "0");
    const day = String(date.getDate()).padStart(DATE_PART_LENGTH, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` as local midnight (`new Date("YYYY-MM-DD")` would be UTC midnight). */
export function parseLocalIsoDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - MONTH_NUMBER_OFFSET, day);
}

export function formatShortDayLabel(isoDate: string): string {
    return formatShortDate(parseLocalIsoDate(isoDate));
}
