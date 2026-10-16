import type { NextConfig } from "next";
import { AUTH_ROUTE_HEADERS, buildSecurityHeaders, toOrigin } from "./src/lib/security-headers";

const securityHeaders = buildSecurityHeaders({
  isProduction: process.env.NODE_ENV === "production",
  isCspEnforced: process.env.CSP_ENFORCE === "true",
  // Until the abuse form goes through /api (SEC-07), the browser calls the backend origin directly.
  directApiOrigin: toOrigin(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"),
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['radix-ui', 'lucide-react']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
  output: 'standalone',
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/auth/:path*", headers: AUTH_ROUTE_HEADERS },
    ];
  },
};

export default nextConfig;
