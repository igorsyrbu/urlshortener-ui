import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {TagItem} from "@/lib/types";
import {fetchTagsResponse, TAGS_PAGE_SIZE} from "@/lib/store/fetch-tags-common";
import {createLatestRequestTracker} from "@/lib/latest-request";

interface TagStore {
    tags: TagItem[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    fetchTags: (params?: { size?: number }) => Promise<void>;
    setSearchQuery: (query: string) => void;
    clearError: () => void;
}

const tagRequests = createLatestRequestTracker();

export const useTagStoreWithCount = create<TagStore>((set, get) => ({
    tags: [],
    loading: false,
    error: null,
    searchQuery: "",

    fetchTags: async (params) => {
        const request = tagRequests.begin();
        const setIfLatest = (partial: Partial<TagStore>): void => {
            if (request.isLatest()) set(partial);
        };

        set({loading: true, error: null});
        try {
            const {searchQuery} = get();
            const query = new URLSearchParams();
            query.set("withLinksCount", "true");
            query.set("size", String(params?.size ?? TAGS_PAGE_SIZE));
            if (searchQuery) {
                query.set("search", searchQuery);
            }

            await fetchTagsResponse(query, setIfLatest, (url) => fetchWithAuth(url, {signal: request.signal}));
        } catch (error) {
            if (request.signal.aborted) return;
            setIfLatest({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            setIfLatest({loading: false});
        }
    },

    setSearchQuery: (query) => set({searchQuery: query}),

    clearError: () => set({error: null}),
}));


