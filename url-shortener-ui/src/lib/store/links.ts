import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {LinkItem} from "@/lib/types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {ShortLinkDTO, PageDTO} from "@/lib/api-types";

interface LinkStore {
    links: LinkItem[];
    loading: boolean;
    error: string | null;
    page: number;
    hasMore: boolean;
    fetchLinks: (page?: number) => Promise<void>;
    setLinks: (links: LinkItem[]) => void;
    clearError: () => void;
}

function mapResponseToLinkItem(item: ShortLinkDTO): LinkItem {
    return {
        id: item.id,
        title: item.title || DEFAULT_LINK_TITLE,
        shortUrl: item.shortUrl,
        longUrl: item.longUrl,
        tagIds: item.tagIds,
    };
}

export const useLinkStore = create<LinkStore>((set, get) => ({
    links: [],
    loading: false,
    error: null,
    page: 0,
    hasMore: true,

    fetchLinks: async (page = 0) => {
        if (get().loading) return;

        set({loading: true, error: null});
        try {
            const res = await fetchWithAuth(
                `${API_ENDPOINTS.SHORTLINKS}?page=${page}&size=${DEFAULT_PAGE_SIZE}`,
            );

            if (res.ok) {
                const data: PageDTO<ShortLinkDTO> = await res.json();
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
            logger.error("Error fetching links", error);
            set({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            set({loading: false});
        }
    },

    setLinks: (links) => set({links}),
    clearError: () => set({error: null}),
}));
