import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {TagItem} from "@/lib/types";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";
import {fetchTagsResponse} from "@/lib/store/fetch-tags-common";

interface TagStore {
    tags: TagItem[];
    loading: boolean;
    error: string | null;
    fetchTags: (params?: { withLinksCount?: boolean; size?: number }) => Promise<void>;
    getTagById: (id: string) => TagItem | undefined;
    clearError: () => void;
}

export const useTagStoreWithoutCount = create<TagStore>((set, get) => ({
    tags: [],
    loading: false,
    error: null,

    fetchTags: async (params) => {
        if (get().loading) return;

        set({loading: true, error: null});
        try {
            const query = new URLSearchParams();
            query.set("withLinksCount", "false");
            query.set("size", String(params?.size ?? 20));

            await fetchTagsResponse(query, set, fetchWithAuth);
        } catch (error) {
            set({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            set({loading: false});
        }
    },

    getTagById: (id) => get().tags.find((tag) => tag.id === id),

    clearError: () => set({error: null}),
}));


