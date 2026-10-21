import {describe, expect, it} from "vitest";

const ONE_DAY_SECONDS = 86_400;
import nextConfig from "../next.config";
import {AUTH_ROUTE_HEADERS} from "@/lib/security-headers";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

describe("next.config", () => {
    it("hides the X-Powered-By header", () => {
        expect(nextConfig.poweredByHeader).toBe(false);
    });

    it("applies the security headers to every route and no-referrer to the sign-in routes", async () => {
        const rules = await nextConfig.headers?.();

        expect(rules?.slice(0, 2).map((rule) => rule.source)).toEqual(["/:path*", "/auth/:path*"]);
        expect(rules?.[1].headers).toEqual(AUTH_ROUTE_HEADERS);
    });

    it.each(["/icons/:path*", "/favicon.ico", "/manifest.webmanifest"])("lets browsers reuse %s for at least a day", async (source) => {
        const rules = await nextConfig.headers?.();
        const cacheControl = rules?.find((rule) => rule.source === source)?.headers
            .find((header) => header.key === "Cache-Control")?.value ?? "";

        expect(Number(/max-age=(\d+)/.exec(cacheControl)?.[1])).toBeGreaterThanOrEqual(ONE_DAY_SECONDS);
        expect(cacheControl).not.toContain("immutable");
    });

    it("keeps proxying /api to the backend", async () => {
        const rewrites = await nextConfig.rewrites?.();

        expect(rewrites).toEqual([expect.objectContaining({source: "/api/:path*"})]);
    });

    it("redirects /settings to the default settings tab over HTTP, not permanently", async () => {
        const redirects = await nextConfig.redirects?.();

        expect(redirects).toEqual([{source: "/settings", destination: SETTINGS_ROUTES.DEFAULT, permanent: false}]);
    });
});
