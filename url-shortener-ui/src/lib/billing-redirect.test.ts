import {beforeEach, describe, expect, it, vi} from "vitest";
import {
    openBlankBillingTab,
    showBillingUrlInTab,
    parseBillingUrl,
    redirectToBillingUrl,
    UnsafeBillingUrlError,
} from "@/lib/billing-redirect";
import {allowTestBillingOrigins, createFakeBillingTab} from "@/test/billing-utils";

const PORTAL_URL = "https://billing.polar.sh/portal/test";
const CHECKOUT_URL = "https://buy.polar.sh/checkout/abc";
const LOADING_TEXT = "Opening portal…";
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

describe("openBlankBillingTab", () => {
    it("opens an empty tab that shows the loading text and cannot reach this page", () => {
        const {tab} = createFakeBillingTab();
        const openSpy = vi.spyOn(window, "open").mockReturnValue(tab);

        expect(openBlankBillingTab(LOADING_TEXT)).toBe(tab);

        expect(openSpy).toHaveBeenCalledWith("about:blank", "_blank");
        expect(tab.opener).toBeNull();
        expect(tab.document.title).toBe(LOADING_TEXT);
        expect(tab.document.body.textContent).toBe(LOADING_TEXT);
    });

    it("returns null when the browser blocks the tab", () => {
        vi.spyOn(window, "open").mockReturnValue(null);

        expect(openBlankBillingTab(LOADING_TEXT)).toBeNull();
    });
});

describe("showBillingUrlInTab", () => {
    it("sends the opened tab to the billing url", () => {
        const {tab, replaceLocation} = createFakeBillingTab();

        showBillingUrlInTab(tab, PORTAL_URL);

        expect(replaceLocation).toHaveBeenCalledExactlyOnceWith(PORTAL_URL);
    });

    it("falls back to the current tab when no tab could be opened", () => {
        const assign = vi.fn();
        vi.stubGlobal("location", {...window.location, assign});

        showBillingUrlInTab(null, PORTAL_URL);

        expect(assign).toHaveBeenCalledExactlyOnceWith(PORTAL_URL);
    });

    it("navigates nowhere for an unsafe URL", () => {
        const {tab, replaceLocation} = createFakeBillingTab();

        expect(() => showBillingUrlInTab(tab, "//evil.example/portal")).toThrow(UnsafeBillingUrlError);
        expect(replaceLocation).not.toHaveBeenCalled();
    });
});
