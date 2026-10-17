import {prefetchRandomKey} from "@/lib/random-key";
import {usePreferencesStore} from "@/lib/store/preferences";

/** Starts what the create-link form loads on open (a random key, tracker preferences) when the user is about to open it. */
export function prefetchCreateLinkData(): void {
    prefetchRandomKey();
    void usePreferencesStore.getState().fetchPreferences();
}
