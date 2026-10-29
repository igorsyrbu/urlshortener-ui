import {prefetchRandomKey} from "@/lib/random-key";
import {usePreferencesStore} from "@/lib/store/preferences";
import {prefetchServerState} from "@/lib/query/active-query-client";
import {allTagsQueryOptions} from "@/lib/query/tag-queries";

/**
 * Starts what the create-link form loads on open (a random key, tracker preferences, the tags for its picker) when the
 * user is about to open it.
 */
export function prefetchCreateLinkData(): void {
    prefetchRandomKey();
    void usePreferencesStore.getState().fetchPreferences();
    prefetchServerState(allTagsQueryOptions);
}
