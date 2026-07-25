export function parseRetryAfter(headers: Headers): number | null {
    const value = headers.get("Retry-After");
    if (!value) return null;
    const seconds = parseInt(value, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
