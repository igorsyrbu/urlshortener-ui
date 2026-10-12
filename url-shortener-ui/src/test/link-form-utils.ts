import {vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";

export type RouteHandler = (init: RequestInit | undefined, endpoint: string) => Response | Promise<Response>;

const NOT_FOUND_STATUS = 404;

export function routeFetchWithAuth(routes: Record<string, RouteHandler>): void {
    vi.mocked(fetchWithAuth).mockImplementation(async (endpoint, init) => {
        const handler = routes[endpoint.split("?")[0]];
        return handler ? handler(init, endpoint) : new Response(null, {status: NOT_FOUND_STATUS});
    });
}

export function getRequestsTo(endpoint: string, method?: string): RequestInit[] {
    return vi.mocked(fetchWithAuth).mock.calls
        .filter(([calledEndpoint, init]) => calledEndpoint === endpoint && (method === undefined || init?.method === method))
        .map(([, init]) => init ?? {});
}

export function parseRequestBody(init: RequestInit | undefined): Record<string, unknown> {
    return JSON.parse(String(init?.body ?? "{}"));
}

export function getQueriesOfRequestsTo(path: string): URLSearchParams[] {
    return vi.mocked(fetchWithAuth).mock.calls
        .filter(([endpoint]) => endpoint.split("?")[0] === path)
        .map(([endpoint]) => new URLSearchParams(endpoint.split("?")[1] ?? ""));
}
