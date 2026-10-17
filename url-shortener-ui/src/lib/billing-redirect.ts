const HTTPS_PROTOCOL = "https:";
const HTTP_PROTOCOL = "http:";
const LOOPBACK_HOSTNAMES: readonly string[] = ["localhost", "127.0.0.1", "[::1]"];
const NEW_TAB_TARGET = "_blank";
const BLANK_PAGE_URL = "about:blank";

export class UnsafeBillingUrlError extends Error {
    constructor() {
        super("Billing URL is not on an allowed origin");
        this.name = "UnsafeBillingUrlError";
    }
}

/** Hosted checkout/portal origins of the payment provider, from `NEXT_PUBLIC_BILLING_ORIGINS` (comma-separated). */
function getAllowedBillingOrigins(): string[] {
    return (process.env.NEXT_PUBLIC_BILLING_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function isDevelopmentLoopback(url: URL): boolean {
    return process.env.NODE_ENV !== "production" && LOOPBACK_HOSTNAMES.includes(url.hostname);
}

/**
 * Accepts only a URL the browser may be sent to for billing: `https:` on an allowed origin, or `http(s):` on
 * localhost outside production (the mock server). Anything else (`javascript:`, protocol-relative, foreign hosts)
 * throws, because the URL comes from the API and is used as a top-level navigation target.
 */
export function parseBillingUrl(rawUrl: string): URL {
    const url = URL.canParse(rawUrl) ? new URL(rawUrl) : null;
    if (url === null) throw new UnsafeBillingUrlError();
    if (isDevelopmentLoopback(url) && (url.protocol === HTTP_PROTOCOL || url.protocol === HTTPS_PROTOCOL)) return url;
    if (url.protocol !== HTTPS_PROTOCOL || !getAllowedBillingOrigins().includes(url.origin)) {
        throw new UnsafeBillingUrlError();
    }
    return url;
}

export function redirectToBillingUrl(rawUrl: string): void {
    window.location.assign(parseBillingUrl(rawUrl).href);
}

/** Opens an empty tab synchronously, while the click still counts as a user gesture; `null` when blocked. */
export function openBlankBillingTab(loadingText: string): Window | null {
    const tab = window.open(BLANK_PAGE_URL, NEW_TAB_TARGET);
    if (tab === null) return null;
    tab.opener = null;
    tab.document.title = loadingText;
    tab.document.body.textContent = loadingText;
    return tab;
}

/** Sends the tab from `openBlankBillingTab` to the billing URL, or the current tab when no tab could be opened. */
export function showBillingUrlInTab(tab: Window | null, rawUrl: string): void {
    const url = parseBillingUrl(rawUrl).href;
    if (tab === null) window.location.assign(url);
    else tab.location.replace(url);
}
