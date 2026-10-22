import {describe, expect, it, vi} from "vitest";
import {formatFullDate, formatNumber, formatRegionName, formatShortDate} from "@/lib/format";
import {FAR_FROM_UTC_TIME_ZONES} from "@/test/time-zone-utils";

const MARCH_15_2027 = new Date(2027, 2, 15);

describe("format", () => {
    it("groups the digits of large numbers", () => {
        expect(formatNumber(1234567)).toBe("1,234,567");
        expect(formatNumber(0)).toBe("0");
    });

    it("formats a short date with the month and day", () => {
        expect(formatShortDate(MARCH_15_2027)).toBe("Mar 15");
    });

    it("formats a full date with the year", () => {
        expect(formatFullDate(MARCH_15_2027)).toBe("Mar 15, 2027");
    });

    it("names a region in English", () => {
        expect(formatRegionName("DE")).toBe("Germany");
    });

    it.each(["ZZZ", "not a code", ""])("falls back to the code itself for %j", (code) => {
        expect(formatRegionName(code)).toBe(code);
    });
});

describe.each(FAR_FROM_UTC_TIME_ZONES)("dates in %s", (timeZone) => {
    it("follow the time zone in effect when they are formatted, not the one at load time", () => {
        vi.stubEnv("TZ", timeZone);

        expect(formatShortDate(new Date(2026, 9, 1))).toBe("Oct 1");
        expect(formatFullDate(new Date(2026, 9, 1))).toBe("Oct 1, 2026");
    });
});
