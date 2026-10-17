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
const URL_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Normalizes a raw user input string into a proper URL.
 * If the string looks like a bare domain (e.g. `google.com`), `https://` is prepended.
 * Returns the (possibly unchanged) string — does NOT validate it.
 */
export function normalizeUrl(value: string): string {
    const trimmed = value.trim();

    if (
        !URL_SCHEME_REGEX.test(trimmed) &&
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

const SHORT_KEY_MAX_LENGTH = 30;
const SHORT_KEY_REGEX = /^[A-Za-z0-9-]+$/;

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

/** The short key in the last path segment of a short URL, or the value itself when it is not a URL. */
export function extractKeyFromShortUrl(shortUrl: string): string {
    try {
        return new URL(shortUrl).pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
        return shortUrl;
    }
}

/** The short URL with its last path segment replaced by `key`; unchanged when it is not a URL. */
export function withShortKey(shortUrl: string, key: string): string {
    try {
        const url = new URL(shortUrl);
        const segments = url.pathname.split("/").filter(Boolean);
        segments[Math.max(segments.length - 1, 0)] = encodeURIComponent(key);
        url.pathname = `/${segments.join("/")}`;
        return url.toString();
    } catch {
        return shortUrl;
    }
}
