import type {FetchQueryOptions, QueryClient, QueryKey} from "@tanstack/react-query";
import {refreshAfter, type ServerStateChange} from "@/lib/query/invalidation";

let activeQueryClient: QueryClient | null = null;

/** Set by `QueryProvider` while the dashboard is mounted, so stores outside React can refresh server state. */
export function setActiveQueryClient(queryClient: QueryClient | null): void {
    activeQueryClient = queryClient;
}

/** `refreshAfter` for code outside React; does nothing outside the dashboard. */
export function refreshServerStateAfter(change: ServerStateChange): void {
    if (activeQueryClient) void refreshAfter(activeQueryClient, change);
}

/** Starts loading a query ahead of need (an intent to open a form); does nothing outside the dashboard. */
export function prefetchServerState<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): void {
    void activeQueryClient?.prefetchQuery(options);
}
