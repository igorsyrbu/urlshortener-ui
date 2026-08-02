/**
 * Extracts the hostname from a full URL string.
 *
 * @throws if the URL is malformed.
 */
export function getDomain(url: string): string {
    return new URL(url).hostname;
}

/**
 * Returns `true` when `value` is a well-formed `http:` or `https:` URL.
 */
export function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

const BARE_DOMAIN_REGEX = /^[a-zA-Z0-9]/;

/**
 * Normalizes a raw user input string into a proper URL.
 * If the string looks like a bare domain (e.g. `google.com`), `https://` is prepended.
 * Returns the (possibly unchanged) string — does NOT validate it.
 */
export function normalizeUrl(value: string): string {
    const trimmed = value.trim();

    if (
        !/^https?:\/\//i.test(trimmed) &&
        BARE_DOMAIN_REGEX.test(trimmed) &&
        trimmed.includes(".")
    ) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

// ---------------------------------------------------------------------------
// Short link key validation
// ---------------------------------------------------------------------------

export const SHORT_KEY_MAX_LENGTH = 30;
const SHORT_KEY_REGEX = /^[A-Za-z0-9-]+$/;

export function isValidShortKey(value: string): boolean {
    return SHORT_KEY_REGEX.test(value) && value.length <= SHORT_KEY_MAX_LENGTH;
}

export function getShortKeyValidationError(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (!SHORT_KEY_REGEX.test(trimmed)) {
        return "Key can only contain letters, numbers, and hyphens.";
    }
    if (trimmed.length > SHORT_KEY_MAX_LENGTH) {
        return "Key must be 30 characters or fewer.";
    }
    return null;
}
