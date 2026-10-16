import {describe, expect, it} from "vitest";
import nextConfig from "../../next.config";
import {
    AUTH_ROUTE_HEADERS,
    buildContentSecurityPolicy,
    buildSecurityHeaders,
    CSP_HEADER,
    CSP_REPORT_ONLY_HEADER,
    type SecurityHeadersOptions,
    TURNSTILE_ORIGIN,
} from "@/lib/security-headers";

const PRODUCTION: SecurityHeadersOptions = {isProduction: true, isCspEnforced: false};
const DEVELOPMENT: SecurityHeadersOptions = {...PRODUCTION, isProduction: false};

function directives(policy: string): Map<string, string[]> {
    return new Map(policy.split("; ").map((directive) => {
        const [name, ...sources] = directive.split(" ");
        return [name, sources];
    }));
}

function headerValue(headers: {key: string; value: string}[], key: string): string | undefined {
    return headers.find((header) => header.key === key)?.value;
}

describe("content security policy", () => {
    it("forbids framing, plugins and base-tag hijacking", () => {
        const policy = directives(buildContentSecurityPolicy(PRODUCTION));

        expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
        expect(policy.get("object-src")).toEqual(["'none'"]);
        expect(policy.get("base-uri")).toEqual(["'self'"]);
    });

    it("allows scripts only from this origin and Turnstile, without wildcards or data URLs", () => {
        const scriptSources = directives(buildContentSecurityPolicy(PRODUCTION)).get("script-src") ?? [];

        expect(scriptSources).toContain(TURNSTILE_ORIGIN);
        expect(scriptSources).not.toContain("*");
        expect(scriptSources).not.toContain("data:");
    });

    it("allows eval only in development", () => {
        expect(directives(buildContentSecurityPolicy(PRODUCTION)).get("script-src")).not.toContain("'unsafe-eval'");
        expect(directives(buildContentSecurityPolicy(DEVELOPMENT)).get("script-src")).toContain("'unsafe-eval'");
    });

    it("lets the browser connect only to this origin (the backend is reached through /api)", () => {
        expect(directives(buildContentSecurityPolicy(PRODUCTION)).get("connect-src")).toEqual(["'self'"]);
    });

    it("upgrades insecure requests only in production, so the local http backend keeps working", () => {
        expect(directives(buildContentSecurityPolicy(PRODUCTION)).has("upgrade-insecure-requests")).toBe(true);
        expect(directives(buildContentSecurityPolicy(DEVELOPMENT)).has("upgrade-insecure-requests")).toBe(false);
    });
});

describe("security headers", () => {
    it("reports policy violations without blocking by default", () => {
        const headers = buildSecurityHeaders(PRODUCTION);

        expect(headerValue(headers, CSP_REPORT_ONLY_HEADER)).toBeDefined();
        expect(headerValue(headers, CSP_HEADER)).toBeUndefined();
    });

    it("enforces the policy when asked to", () => {
        const headers = buildSecurityHeaders({...PRODUCTION, isCspEnforced: true});

        expect(headerValue(headers, CSP_HEADER)).toBeDefined();
        expect(headerValue(headers, CSP_REPORT_ONLY_HEADER)).toBeUndefined();
    });

    it("sends the standard protective headers", () => {
        const headers = buildSecurityHeaders(DEVELOPMENT);

        expect(headerValue(headers, "X-Content-Type-Options")).toBe("nosniff");
        expect(headerValue(headers, "X-Frame-Options")).toBe("DENY");
        expect(headerValue(headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
        expect(headerValue(headers, "Permissions-Policy")).toContain("camera=()");
    });

    it("sends HSTS only in production", () => {
        expect(headerValue(buildSecurityHeaders(PRODUCTION), "Strict-Transport-Security")).toContain("max-age=");
        expect(headerValue(buildSecurityHeaders(DEVELOPMENT), "Strict-Transport-Security")).toBeUndefined();
    });

    it("never sends a referrer from the sign-in routes", () => {
        expect(headerValue(AUTH_ROUTE_HEADERS, "Referrer-Policy")).toBe("no-referrer");
    });
});

describe("next.config", () => {
    it("hides the X-Powered-By header", () => {
        expect(nextConfig.poweredByHeader).toBe(false);
    });

    it("applies the security headers to every route and no-referrer to the sign-in routes", async () => {
        const rules = await nextConfig.headers?.();

        expect(rules?.map((rule) => rule.source)).toEqual(["/:path*", "/auth/:path*"]);
        expect(rules?.[1].headers).toEqual(AUTH_ROUTE_HEADERS);
    });

    it("keeps proxying /api to the backend", async () => {
        const rewrites = await nextConfig.rewrites?.();

        expect(rewrites).toEqual([expect.objectContaining({source: "/api/:path*"})]);
    });
});
