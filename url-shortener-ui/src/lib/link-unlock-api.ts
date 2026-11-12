import {API_BASE_URL} from "@/lib/api";
import {ApiError} from "@/lib/api-request";
import {RATE_LIMIT_RETRY_AFTER_HEADER} from "@/lib/billing-constants";
import {API_ENDPOINTS} from "@/lib/constants";
import {parseProblemDetail} from "@/lib/problem-details";
import {parseRetryAfterSeconds} from "@/lib/retry-after";

const TURNSTILE_RESPONSE_FIELD = "cf-turnstile-response";

/** A refused unlock; `retryAfterSeconds` is set only by the endpoint's rate limit (the wrong-password lockout sends none). */
export class UnlockLinkError extends ApiError {
    readonly retryAfterSeconds: number | null;

    constructor(status: number, message: string, retryAfterSeconds: number | null) {
        super(status, message);
        this.name = "UnlockLinkError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

function readDestination(payload: unknown): string | null {
    if (typeof payload !== "object" || payload === null || !("longUrl" in payload)) return null;
    return typeof payload.longUrl === "string" ? payload.longUrl : null;
}

/**
 * Exchanges a protected link's password for its destination. Anonymous, so plain `fetch` (no token, no refresh).
 * `queryString` is the visitor's own (`window.location.search`); the backend appends it to the destination.
 * Rejects with `UnlockLinkError` when the server refuses, and with the `fetch` error when it cannot be reached.
 */
export async function unlockLink(key: string, password: string, captchaToken: string | null, queryString: string): Promise<string> {
    const body = new URLSearchParams({password});
    if (captchaToken) body.set(TURNSTILE_RESPONSE_FIELD, captchaToken);
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SHORTLINK_UNLOCK(key)}${queryString}`, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: body.toString(),
        cache: "no-store",
    });
    if (!response.ok) {
        const retryAfterSeconds = parseRetryAfterSeconds(response.headers, RATE_LIMIT_RETRY_AFTER_HEADER);
        throw new UnlockLinkError(response.status, parseProblemDetail(await response.text(), response.status), retryAfterSeconds);
    }
    const longUrl = readDestination(await response.json());
    if (longUrl === null) throw new UnlockLinkError(response.status, parseProblemDetail("", response.status), null);
    return longUrl;
}
