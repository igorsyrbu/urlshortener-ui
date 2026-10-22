/*
 * Every number and date shown in the UI is formatted here. Numbers and dates follow the browser's locale; country
 * names stay English to match the rest of the English UI.
 */
const BROWSER_LOCALE = undefined;
const REGION_NAME_LOCALE = "en";

const numberFormat = new Intl.NumberFormat(BROWSER_LOCALE);
// Date formatters are not cached: an Intl.DateTimeFormat keeps the time zone it was created in, so a cached one shows
// the wrong day after the zone changes (a travelling laptop). toLocaleDateString reads the current zone on each call.
const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {month: "short", day: "numeric"};
const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = {year: "numeric", month: "short", day: "numeric"};
const regionNames = new Intl.DisplayNames([REGION_NAME_LOCALE], {type: "region"});

/** `12345` -> `12,345` (in en-US). */
export function formatNumber(value: number): string {
    return numberFormat.format(value);
}

/** Day and short month, e.g. `Mar 15`. */
export function formatShortDate(date: Date): string {
    return date.toLocaleDateString(BROWSER_LOCALE, SHORT_DATE_OPTIONS);
}

/** Day, short month and year, e.g. `Mar 15, 2027`. */
export function formatFullDate(date: Date): string {
    return date.toLocaleDateString(BROWSER_LOCALE, FULL_DATE_OPTIONS);
}

/** The English name of an ISO 3166 region code, or the code itself when it is not a valid region. */
export function formatRegionName(regionCode: string): string {
    try {
        return regionNames.of(regionCode) || regionCode;
    } catch {
        return regionCode;
    }
}
