import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {QueryClient} from "@tanstack/react-query";
import {prefetchCreateLinkData} from "@/lib/prefetch-create-link";
import {setActiveQueryClient} from "@/lib/query/active-query-client";
import {allTagsQueryOptions} from "@/lib/query/tag-queries";
import {usePreferencesStore} from "@/lib/store/preferences";
import {prefetchRandomKey} from "@/lib/random-key";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/random-key", () => ({prefetchRandomKey: vi.fn()}));

describe("prefetchCreateLinkData", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        setActiveQueryClient(queryClient);
        vi.spyOn(usePreferencesStore.getState(), "fetchPreferences").mockResolvedValue(true);
        vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue(undefined);
    });

    afterEach(() => {
        setActiveQueryClient(null);
    });

    it("starts the random key, the preferences and the tags for the picker", () => {
        prefetchCreateLinkData();

        expect(prefetchRandomKey).toHaveBeenCalledOnce();
        expect(usePreferencesStore.getState().fetchPreferences).toHaveBeenCalledOnce();
        expect(queryClient.prefetchQuery).toHaveBeenCalledExactlyOnceWith(allTagsQueryOptions);
    });

    it("still starts the random key and the preferences outside the dashboard, where there is no query client", () => {
        setActiveQueryClient(null);

        prefetchCreateLinkData();

        expect(prefetchRandomKey).toHaveBeenCalledOnce();
        expect(usePreferencesStore.getState().fetchPreferences).toHaveBeenCalledOnce();
        expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
    });
});
