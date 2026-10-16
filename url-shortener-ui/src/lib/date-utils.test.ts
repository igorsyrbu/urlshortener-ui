import {describe, expect, it} from "vitest";
import {FIRST_ANALYTICS_YEAR} from "@/lib/constants";
import {getSelectableAnalyticsYears} from "@/lib/date-utils";

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
