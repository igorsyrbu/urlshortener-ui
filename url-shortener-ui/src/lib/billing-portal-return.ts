export const PORTAL_RETURN_STORAGE_KEY = "urlshortener:billing:portal-return";
export const PORTAL_RETURN_FALLBACK_TTL_MS = 10 * 60 * 1000;
const MILLISECONDS_PER_SECOND = 1000;

interface PortalReturnEntry {
    expiresAtMs: number;
}

function readPortalReturnEntry(): PortalReturnEntry | null {
    try {
        const raw = localStorage.getItem(PORTAL_RETURN_STORAGE_KEY);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return null;
        if (!("expiresAtMs" in parsed)) return null;
        const {expiresAtMs} = parsed;
        if (typeof expiresAtMs !== "number" || !Number.isFinite(expiresAtMs)) return null;
        return {expiresAtMs};
    } catch {
        return null;
    }
}

function resolvePortalReturnTtlMs(expiresInSeconds: number | null): number {
    if (expiresInSeconds === null || !Number.isSafeInteger(expiresInSeconds) || expiresInSeconds < 0) {
        return PORTAL_RETURN_FALLBACK_TTL_MS;
    }
    return expiresInSeconds * MILLISECONDS_PER_SECOND;
}

export function markPortalOpened(expiresInSeconds: number | null): void {
    try {
        const entry: PortalReturnEntry = {
            expiresAtMs: Date.now() + resolvePortalReturnTtlMs(expiresInSeconds),
        };
        localStorage.setItem(PORTAL_RETURN_STORAGE_KEY, JSON.stringify(entry));
    } catch {
        // Storage unavailable (SSR, private mode) — return refresh just stays disabled.
    }
}

export function consumePortalReturn(): boolean {
    try {
        const entry = readPortalReturnEntry();
        localStorage.removeItem(PORTAL_RETURN_STORAGE_KEY);
        if (entry === null) return false;
        return entry.expiresAtMs > Date.now();
    } catch {
        return false;
    }
}
