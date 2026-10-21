import {afterEach, describe, expect, it, vi} from "vitest";
import {prefetchCreateLinkData} from "@/lib/prefetch-create-link";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {usePreferencesStore} from "@/lib/store/preferences";
import {prefetchRandomKey} from "@/lib/random-key";

vi.mock("@/lib/random-key", () => ({prefetchRandomKey: vi.fn()}));

describe("prefetchCreateLinkData", () => {
    const initialTags = useTagStoreWithoutCount.getInitialState();

    afterEach(() => {
        useTagStoreWithoutCount.setState(initialTags, true);
    });

    it("starts the random key, the preferences and the tags for the picker", () => {
        const ensureLoaded = vi.fn();
        const fetchPreferences = vi.fn().mockResolvedValue(true);
        useTagStoreWithoutCount.setState({ensureLoaded});
        vi.spyOn(usePreferencesStore.getState(), "fetchPreferences").mockImplementation(fetchPreferences);

        prefetchCreateLinkData();

        expect(prefetchRandomKey).toHaveBeenCalledOnce();
        expect(fetchPreferences).toHaveBeenCalledOnce();
        expect(ensureLoaded).toHaveBeenCalledOnce();
    });
});
