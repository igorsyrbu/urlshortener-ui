import {beforeEach, describe, expect, it, vi} from "vitest";
import {FIRST_ANALYTICS_YEAR} from "@/lib/constants";
import {
    formatLocalIsoDate,
    formatShortDayLabel,
    getSelectableAnalyticsYears,
    getTodayAtMidnight,
    parseLocalIsoDate,
} from "@/lib/date-utils";
import {FAR_FROM_UTC_TIME_ZONES} from "@/test/time-zone-utils";

describe("getSelectableAnalyticsYears", () => {
    it("offers only the first analytics year during that year", () => {
        expect(getSelectableAnalyticsYears(FIRST_ANALYTICS_YEAR)).toEqual([FIRST_ANALYTICS_YEAR]);
    });

    it("includes every year from the first analytics year up to the current one", () => {
        const currentYear = FIRST_ANALYTICS_YEAR + 2;

        expect(getSelectableAnalyticsYears(currentYear)).toEqual([
            FIRST_ANALYTICS_YEAR,
            FIRST_ANALYTICS_YEAR + 1,
            FIRST_ANALYTICS_YEAR + 2,
        ]);
    });

    it("still offers the first analytics year when the clock is behind it", () => {
        expect(getSelectableAnalyticsYears(FIRST_ANALYTICS_YEAR - 1)).toEqual([FIRST_ANALYTICS_YEAR]);
    });
});

describe.each(FAR_FROM_UTC_TIME_ZONES)("local calendar dates in %s", (timeZone) => {
    beforeEach(() => {
        vi.stubEnv("TZ", timeZone);
    });

    it("formats the local calendar day, not the UTC one", () => {
        expect(formatLocalIsoDate(new Date(2026, 9, 1))).toBe("2026-10-01");
    });

    it("pads single-digit months and days", () => {
        expect(formatLocalIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    });

    it("parses a date-only string as local midnight", () => {
        const parsed = parseLocalIsoDate("2026-10-01");

        expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()]).toEqual([2026, 9, 1, 0]);
    });

    it("round-trips a date-only string", () => {
        expect(formatLocalIsoDate(parseLocalIsoDate("2026-12-31"))).toBe("2026-12-31");
    });

    it("labels a data day with that same day", () => {
        expect(formatShortDayLabel("2026-10-01")).toBe("Oct 1");
    });

    it("returns local midnight of the given moment", () => {
        const today = getTodayAtMidnight(new Date(2026, 9, 12, 23, 59));

        expect(formatLocalIsoDate(today)).toBe("2026-10-12");
        expect(today.getHours()).toBe(0);
    });
});
