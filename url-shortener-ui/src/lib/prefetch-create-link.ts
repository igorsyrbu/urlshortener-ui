import {prefetchRandomKey} from "@/lib/random-key";
import {usePreferencesStore} from "@/lib/store/preferences";
import {useTagStoreWithoutCount} from "@/lib/store/tags";

/**
 * Starts what the create-link form loads on open (a random key, tracker preferences, the tags for its picker) when the
 * user is about to open it. The tags matter outside `/links`, the only page that loads them itself.
 */
export function prefetchCreateLinkData(): void {
    prefetchRandomKey();
    void usePreferencesStore.getState().fetchPreferences();
    useTagStoreWithoutCount.getState().ensureLoaded();
}
