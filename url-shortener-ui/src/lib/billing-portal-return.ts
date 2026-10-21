export const PORTAL_RETURN_STORAGE_KEY = "urlshortener:billing:portal-return";
/** Changes made in the portal stay worth a refresh well past the portal session's own lifetime. */
export const PORTAL_RETURN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface PortalReturnEntry {
    openedAtMs: number;
}

/**
 * The flag lives in `sessionStorage`: per tab, so another tab with the billing page cannot take the refresh, it
 * survives a reload of this tab, it is not shared with the portal tab opened by `window.open`, and it ends with the tab.
 */
function readPortalReturnEntry(): PortalReturnEntry | null {
    try {
        const raw = sessionStorage.getItem(PORTAL_RETURN_STORAGE_KEY);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || !("openedAtMs" in parsed)) return null;
        const {openedAtMs} = parsed;
        return typeof openedAtMs === "number" && Number.isFinite(openedAtMs) ? {openedAtMs} : null;
    } catch {
        return null;
    }
}

export function markPortalOpened(): void {
    try {
        const entry: PortalReturnEntry = {openedAtMs: Date.now()};
        sessionStorage.setItem(PORTAL_RETURN_STORAGE_KEY, JSON.stringify(entry));
    } catch {
        // Storage unavailable (private mode): the return refresh stays off.
    }
}

/** True while this tab opened the portal recently; it stays true until `clearPortalReturn`, so a failed refresh can retry. */
export function peekPortalReturn(): boolean {
    const entry = readPortalReturnEntry();
    return entry !== null && Date.now() - entry.openedAtMs < PORTAL_RETURN_MAX_AGE_MS;
}

export function clearPortalReturn(): void {
    try {
        sessionStorage.removeItem(PORTAL_RETURN_STORAGE_KEY);
    } catch {
        // Nothing to clear when storage is unavailable.
    }
}
