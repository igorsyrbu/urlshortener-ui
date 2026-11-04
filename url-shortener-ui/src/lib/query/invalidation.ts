import type {QueryClient, QueryKey} from "@tanstack/react-query";
import {queryKeys} from "@/lib/query/query-keys";

/**
 * The one place that decides which cached server data a change makes stale. Optimistic edits of the data on screen
 * happen where the change is made; this decides what is refetched afterwards so the server has the last word.
 */
export const STALE_AFTER = {
    /** A new, saved or deleted link can add or remove tag assignments, so the tags page's link counts change too. */
    linkCreated: [queryKeys.links.all, queryKeys.tags.withLinkCounts],
    linkSaved: [queryKeys.links.all, queryKeys.tags.withLinkCounts],
    linkDeleted: [queryKeys.links.all, queryKeys.tags.withLinkCounts],
    linkArchived: [queryKeys.links.all],
    /** The tag lists are edited in place; links that carried the tag change on the server. */
    tagDeleted: [queryKeys.links.all],
    importCompleted: [queryKeys.links.all, queryKeys.tags.all],
    profileNameSaved: [queryKeys.user.all],
} as const satisfies Record<string, readonly QueryKey[]>;

export type ServerStateChange = keyof typeof STALE_AFTER;

/** Marks what `change` makes stale and refetches the queries on screen; resolves once those refetches have settled. */
export async function refreshAfter(queryClient: QueryClient, change: ServerStateChange): Promise<void> {
    await Promise.all(STALE_AFTER[change].map((queryKey) => queryClient.invalidateQueries({queryKey})));
}
