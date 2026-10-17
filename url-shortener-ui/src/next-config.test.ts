import {describe, expect, it} from "vitest";
import nextConfig from "../next.config";
import {AUTH_ROUTE_HEADERS} from "@/lib/security-headers";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

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

    it("redirects /settings to the default settings tab over HTTP, not permanently", async () => {
        const redirects = await nextConfig.redirects?.();

        expect(redirects).toEqual([{source: "/settings", destination: SETTINGS_ROUTES.DEFAULT, permanent: false}]);
    });
});
