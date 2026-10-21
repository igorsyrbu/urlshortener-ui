import {describe, expect, it} from "vitest";
import {isPathWithin} from "@/lib/route-match";

describe("isPathWithin", () => {
    it.each(["/settings/billing", "/settings/billing/", "/settings/billing/history"])("matches %s", (pathname) => {
        expect(isPathWithin(pathname, "/settings/billing")).toBe(true);
    });

    it.each(["/settings", "/settings/billings", "/settings/general", "/"])("does not match %s", (pathname) => {
        expect(isPathWithin(pathname, "/settings/billing")).toBe(false);
    });
});
