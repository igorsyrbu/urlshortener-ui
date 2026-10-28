import {QueryClient} from "@tanstack/react-query";
import {ApiError} from "@/lib/api-request";
import {HTTP_INTERNAL_SERVER_ERROR, HTTP_REQUEST_TIMEOUT} from "@/lib/http-status";

const DEFAULT_STALE_TIME_MS = 30_000;
const MAX_QUERY_RETRIES = 2;

function isTransientStatus(status: number): boolean {
    return status >= HTTP_INTERNAL_SERVER_ERROR || status === HTTP_REQUEST_TIMEOUT;
}

/** Retries a network failure or a server error twice; a client error (400, 401, 404, ...) will not change on retry. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
    if (failureCount >= MAX_QUERY_RETRIES) return false;
    return !(error instanceof ApiError) || isTransientStatus(error.status);
}

export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {staleTime: DEFAULT_STALE_TIME_MS, retry: shouldRetryQuery},
            mutations: {retry: false},
        },
    });
}
