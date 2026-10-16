export const RETRY_AFTER_HEADER = "Retry-After";

/** Reads a positive whole number of seconds from a retry header; anything else (missing, zero, negative, HTTP-date) is null. */
export function parseRetryAfterSeconds(headers: Headers, headerName: string = RETRY_AFTER_HEADER): number | null {
    const value = headers.get(headerName);
    if (!value) return null;
    const seconds = Number.parseInt(value, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
