export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
export const CSP_HEADER = "Content-Security-Policy";
export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";
const SECONDS_PER_YEAR = 31_536_000;

export interface SecurityHeadersOptions {
    isProduction: boolean;
    /** Enforce the policy; `false` only reports violations (see `isCspEnforcedByEnv`). */
    isCspEnforced: boolean;
}

export interface Header {
    key: string;
    value: string;
}

const CSP_REPORT_ONLY_VALUE = "false";

/** Enforced unless `CSP_ENFORCE=false`, the switch back to Report-Only while a new third party is being added. */
export function isCspEnforcedByEnv(value: string | undefined): boolean {
    return value?.trim().toLowerCase() !== CSP_REPORT_ONLY_VALUE;
}

export function buildContentSecurityPolicy({isProduction}: SecurityHeadersOptions): string {
    // 'unsafe-inline': prerendered pages carry per-page inline flight scripts and the palette init script, which
    // cannot be hashed ahead of time; a nonce would force every page to render dynamically.
    // 'unsafe-eval' is development only (React Refresh and callstack reconstruction).
    const scriptSources = ["'self'", "'unsafe-inline'", TURNSTILE_ORIGIN, ...(isProduction ? [] : ["'unsafe-eval'"])];
    return [
        "default-src 'self'",
        `script-src ${scriptSources.join(" ")}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self'",
        "connect-src 'self'",
        `frame-src ${TURNSTILE_ORIGIN}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
}

export function buildSecurityHeaders(options: SecurityHeadersOptions): Header[] {
    return [
        {key: options.isCspEnforced ? CSP_HEADER : CSP_REPORT_ONLY_HEADER, value: buildContentSecurityPolicy(options)},
        {key: "X-Content-Type-Options", value: "nosniff"},
        {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
        {key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"},
        {key: "X-Frame-Options", value: "DENY"},
        ...(options.isProduction
            ? [{key: "Strict-Transport-Security", value: `max-age=${SECONDS_PER_YEAR}; includeSubDomains`}]
            : []),
    ];
}

/** One-time sign-in codes and tokens travel in `/auth/*` URLs and must never leak through `Referer`. */
export const AUTH_ROUTE_HEADERS: Header[] = [{key: "Referrer-Policy", value: "no-referrer"}];
