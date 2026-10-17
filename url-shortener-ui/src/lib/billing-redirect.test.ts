import {beforeEach, describe, expect, it, vi} from "vitest";
import {
    openBillingUrlInNewTab,
    parseBillingUrl,
    redirectToBillingUrl,
    UnsafeBillingUrlError,
} from "@/lib/billing-redirect";
import {allowTestBillingOrigins} from "@/test/billing-utils";

const PORTAL_URL = "https://billing.polar.sh/portal/test";
const CHECKOUT_URL = "https://buy.polar.sh/checkout/abc";
const MOCK_CHECKOUT_URL = "http://localhost:8080/mock/billing/checkout/abc";

beforeEach(() => {
    allowTestBillingOrigins();
});

describe("parseBillingUrl", () => {
    it.each([
        ["an https URL on an allowed origin", CHECKOUT_URL],
        ["the local mock server outside production", MOCK_CHECKOUT_URL],
    ])("accepts %s", (_name, url) => {
        expect(parseBillingUrl(url).href).toBe(url);
    });

    it.each([
        ["a javascript: URL", "javascript:alert(document.domain)"],
        ["a data: URL", "data:text/html,<script>alert(1)</script>"],
        ["a protocol-relative URL", "//evil.example/x"],
        ["a relative path", "/settings/billing"],
        ["an https URL on another origin", "https://evil.example/checkout"],
        ["a look-alike host", "https://buy.polar.sh.evil.com/checkout"],
        ["plain http on an allowed host", "http://buy.polar.sh/checkout/abc"],
        ["text that is not a URL", "not a url"],
    ])("rejects %s", (_name, url) => {
        expect(() => parseBillingUrl(url)).toThrow(UnsafeBillingUrlError);
    });

    it("rejects localhost in production", () => {
        vi.stubEnv("NODE_ENV", "production");

        expect(() => parseBillingUrl(MOCK_CHECKOUT_URL)).toThrow(UnsafeBillingUrlError);
    });

    it("rejects every origin when no allowlist is configured", () => {
        vi.stubEnv("NEXT_PUBLIC_BILLING_ORIGINS", "");

        expect(() => parseBillingUrl(CHECKOUT_URL)).toThrow(UnsafeBillingUrlError);
    });
});

describe("redirectToBillingUrl", () => {
    it("navigates the current tab to an allowed URL", () => {
        const assign = vi.fn();
        vi.stubGlobal("location", {...window.location, assign});

        redirectToBillingUrl(CHECKOUT_URL);

        expect(assign).toHaveBeenCalledExactlyOnceWith(CHECKOUT_URL);
    });

    it("refuses to navigate to an unsafe URL", () => {
        const assign = vi.fn();
        vi.stubGlobal("location", {...window.location, assign});

        expect(() => redirectToBillingUrl("javascript:alert(1)")).toThrow(UnsafeBillingUrlError);
        expect(assign).not.toHaveBeenCalled();
    });
});

describe("openBillingUrlInNewTab", () => {
    it("opens the billing url in a new tab and severs the opener link", () => {
        const openedWindow = {} as Window;
        const openSpy = vi.spyOn(window, "open").mockReturnValue(openedWindow);

        openBillingUrlInNewTab(PORTAL_URL);

        expect(openSpy).toHaveBeenCalledWith(PORTAL_URL, "_blank");
        expect(openedWindow.opener).toBeNull();
    });

    it("falls back to the current tab when the popup is blocked", () => {
        vi.spyOn(window, "open").mockReturnValue(null);
        const assign = vi.fn();
        vi.stubGlobal("location", {...window.location, assign});

        openBillingUrlInNewTab(PORTAL_URL);

        expect(assign).toHaveBeenCalledExactlyOnceWith(PORTAL_URL);
    });

    it("opens nothing for an unsafe URL", () => {
        const openSpy = vi.spyOn(window, "open");

        expect(() => openBillingUrlInNewTab("//evil.example/portal")).toThrow(UnsafeBillingUrlError);
        expect(openSpy).not.toHaveBeenCalled();
    });
});
