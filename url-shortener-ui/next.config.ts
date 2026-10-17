import type { NextConfig } from "next";
import { getBackendApiBaseUrl } from "./src/lib/backend-url";
import { AUTH_ROUTE_HEADERS, buildSecurityHeaders } from "./src/lib/security-headers";
import { SETTINGS_ROUTES } from "./src/lib/settings-constants";

const securityHeaders = buildSecurityHeaders({
  isProduction: process.env.NODE_ENV === "production",
  isCspEnforced: process.env.CSP_ENFORCE === "true",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['radix-ui', 'lucide-react']
  },
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${getBackendApiBaseUrl()}/:path*`,
      },
    ];
  },
  async redirects() {
    // Answer /settings with an HTTP redirect before any HTML; settings/page.tsx stays as a fallback.
    return [{ source: "/settings", destination: SETTINGS_ROUTES.DEFAULT, permanent: false }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/auth/:path*", headers: AUTH_ROUTE_HEADERS },
    ];
  },
};

export default nextConfig;
