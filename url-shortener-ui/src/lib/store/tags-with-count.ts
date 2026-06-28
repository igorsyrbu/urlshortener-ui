import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {TagItem} from "@/lib/types";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";
import {fetchTagsResponse} from "@/lib/store/fetch-tags-common";

interface TagStore {
    tags: TagItem[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    fetchTags: (params?: { size?: number }) => Promise<void>;
    getTagById: (id: string) => TagItem | undefined;
    setSearchQuery: (query: string) => void;
    clearError: () => void;
}

export const useTagStoreWithCount = create<TagStore>((set, get) => ({
    tags: [],
    loading: false,
    error: null,
    searchQuery: "",

    fetchTags: async (params) => {
        if (get().loading) return;

        set({loading: true, error: null});
        try {
            const {searchQuery} = get();
            const query = new URLSearchParams();
            query.set("withLinksCount", "true");
            query.set("size", String(params?.size ?? 20));
            if (searchQuery) {
                query.set("search", searchQuery);
            }

            await fetchTagsResponse(query, set, fetchWithAuth);
        } catch (error) {
            set({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            set({loading: false});
        }
    },

    getTagById: (id) => get().tags.find((tag) => tag.id === id),

    setSearchQuery: (query) => set({searchQuery: query}),

    clearError: () => set({error: null}),
}));


