const DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8080";

type EnvironmentVariables = Record<string, string | undefined>;

/**
 * Backend base URL for server-side code only: the `/api` rewrite, route handlers and server components.
 * Never import this from client code; the browser reaches the backend through the same-origin `/api` proxy.
 * `NEXT_PUBLIC_API_BASE_URL` is the deprecated fallback: its value is inlined at build time and may end up in client bundles.
 */
export function getBackendApiBaseUrl(env: EnvironmentVariables = process.env): string {
    return env.BACKEND_API_BASE_URL || env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_BACKEND_API_BASE_URL;
}
