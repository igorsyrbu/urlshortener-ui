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
    /** True once a load succeeded; tag mutations keep `tags` current afterwards. */
    hasLoaded: boolean;
    fetchTags: (params?: { size?: number }) => Promise<void>;
    /** Loads the tags unless they are loaded or loading: for places that need them but do not own a refresh. */
    ensureLoaded: () => void;
    setSearchQuery: (query: string) => void;
}

const tagRequests = createLatestRequestTracker();

export const useTagStoreWithoutCount = create<TagStore>((set, get) => ({
    tags: [],
    loading: false,
    error: null,
    searchQuery: "",
    hasLoaded: false,

    fetchTags: async (params) => {
        const request = tagRequests.begin();
        const setIfLatest = (partial: Partial<TagStore>): void => {
            if (request.isLatest()) set(partial);
        };

        set({loading: true, error: null});
        try {
            const {searchQuery} = get();
            const query = new URLSearchParams();
            query.set("withLinksCount", "false");
            query.set("size", String(params?.size ?? TAGS_PAGE_SIZE));
            if (searchQuery) {
                query.set("search", searchQuery);
            }

            await fetchTagsResponse(query, (partial) => setIfLatest(partial.tags ? {...partial, hasLoaded: true} : partial),
                (url) => fetchWithAuth(url, {signal: request.signal}));
        } catch (error) {
            if (request.signal.aborted) return;
            setIfLatest({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            setIfLatest({loading: false});
        }
    },

    ensureLoaded: () => {
        const {hasLoaded, loading, fetchTags} = get();
        if (!hasLoaded && !loading) void fetchTags();
    },

    setSearchQuery: (query) => set({searchQuery: query}),
}));


