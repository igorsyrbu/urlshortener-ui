import {describe, expect, it} from "vitest";
import {findActiveNavItem, NAV_ITEMS} from "@/components/layout/navigation-items";
import {PAGE_TITLES} from "@/lib/constants";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

describe("findActiveNavItem", () => {
    it.each([
        ["/dashboard", PAGE_TITLES.DASHBOARD],
        ["/links", PAGE_TITLES.LINKS],
        ["/analytics", PAGE_TITLES.ANALYTICS],
        ["/tags", PAGE_TITLES.TAGS],
        ["/settings", PAGE_TITLES.SETTINGS],
        [SETTINGS_ROUTES.BILLING, PAGE_TITLES.SETTINGS],
        [`${SETTINGS_ROUTES.GENERAL}/`, PAGE_TITLES.SETTINGS],
    ])("matches %s to the %s section", (pathname, title) => {
        expect(findActiveNavItem(pathname)?.title).toBe(title);
    });

    it.each(["/unknown", "/linksx", "/settingsx"])("matches no section for %s", (pathname) => {
        expect(findActiveNavItem(pathname)).toBeUndefined();
    });

    it("links every section to a page within its own prefix", () => {
        NAV_ITEMS.forEach((item) => {
            expect(item.href.startsWith(item.matchPrefix ?? item.href)).toBe(true);
        });
    });
});
