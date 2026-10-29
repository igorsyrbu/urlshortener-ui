import type {FetchQueryOptions, QueryClient, QueryKey} from "@tanstack/react-query";

let activeQueryClient: QueryClient | null = null;

/** Set by `QueryProvider` while the dashboard is mounted, so stores outside React can refresh server state. */
export function setActiveQueryClient(queryClient: QueryClient | null): void {
    activeQueryClient = queryClient;
}

/** Marks the matching queries stale and refetches the ones on screen; does nothing outside the dashboard. */
export function invalidateServerState(queryKey: QueryKey): void {
    void activeQueryClient?.invalidateQueries({queryKey});
}

/** Starts loading a query ahead of need (an intent to open a form); does nothing outside the dashboard. */
export function prefetchServerState<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
    options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): void {
    void activeQueryClient?.prefetchQuery(options);
}
