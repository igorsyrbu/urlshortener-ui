import {describe, expect, it, vi} from "vitest";
import {openBillingUrlInNewTab} from "@/lib/billing-redirect";

const PORTAL_URL = "https://billing.polar.sh/portal/test";

describe("openBillingUrlInNewTab", () => {
    it("opens the billing url in a new tab and severs the opener link", () => {
        const openedWindow = {} as Window;
        const openSpy = vi.spyOn(window, "open").mockReturnValue(openedWindow);

        openBillingUrlInNewTab(PORTAL_URL);

        expect(openSpy).toHaveBeenCalledWith(PORTAL_URL, "_blank");
        expect(openedWindow.opener).toBeNull();
    });
});
