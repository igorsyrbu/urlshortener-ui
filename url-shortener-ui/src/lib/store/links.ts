import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {LinkItem} from "@/lib/types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE} from "@/lib/constants";

interface ShortLinkResponse {
    id: string;
    title: string;
    shortUrl: string;
    longUrl: string;
    isActive: boolean;
    tagIds?: string[];
}

interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

interface LinkStore {
    links: LinkItem[];
    loading: boolean;
    error: string | null;
    page: number;
    hasMore: boolean;
    showArchived: boolean;
    fetchLinks: (page?: number) => Promise<void>;
    setLinks: (links: LinkItem[]) => void;
    clearError: () => void;
    setShowArchived: (show: boolean) => void;
    toggleLinkActive: (id: string, isActive: boolean) => Promise<void>;
}

function mapResponseToLinkItem(item: ShortLinkResponse): LinkItem {
    return {
        id: item.id,
        title: item.title || DEFAULT_LINK_TITLE,
        shortUrl: item.shortUrl,
        longUrl: item.longUrl,
        isActive: item.isActive,
        tagIds: item.tagIds,
    };
}

export const useLinkStore = create<LinkStore>((set, get) => ({
    links: [],
    loading: false,
    error: null,
    page: 0,
    hasMore: true,
    showArchived: false,

    fetchLinks: async (page = 0) => {
        if (get().loading) return;

        set({loading: true, error: null});
        try {
            const {showArchived} = get();
            const res = await fetchWithAuth(
                `${API_ENDPOINTS.SHORTLINKS}?page=${page}&size=${DEFAULT_PAGE_SIZE}&showArchived=${showArchived}`,
            );

            if (res.ok) {
                const data: PageResponse<ShortLinkResponse> = await res.json();
                const mapped = data.content.map(mapResponseToLinkItem);

                set((state) => ({
                    links: page === 0 ? mapped : [...state.links, ...mapped],
                    page: data.number,
                    hasMore: !data.last,
                }));
            } else {
                set({error: `Failed to fetch links: ${res.status}`});
            }
        } catch (error) {
            console.error("Error fetching links", error);
            set({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            set({loading: false});
        }
    },

    setLinks: (links) => set({links}),
    clearError: () => set({error: null}),

    setShowArchived: (show) => set({showArchived: show}),

    toggleLinkActive: async (id, isActive) => {
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
                method: "PUT",
                body: JSON.stringify({id, isActive}),
            });
            if (res.ok) {
                await get().fetchLinks(0);
            } else {
                set({error: `Failed to toggle link status: ${res.status}`});
            }
        } catch (error) {
            console.error("Error toggling link active state", error);
            set({error: error instanceof Error ? error.message : "Unknown error occurred"});
        }
    },
}));
