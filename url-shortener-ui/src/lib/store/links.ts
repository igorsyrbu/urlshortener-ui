import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {LinkItem} from "@/lib/types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE, SHOW_ARCHIVED_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {ShortLinkDTO, PageDTO} from "@/lib/api-types";

interface LinkStore {
    links: LinkItem[];
    loading: boolean;
    error: string | null;
    showArchived: boolean;
    searchQuery: string;
    currentPage: number;
    totalElements: number;
    totalPages: number;
    fetchLinks: (page?: number) => Promise<void>;
    clearError: () => void;
    setShowArchived: (show: boolean) => void;
    setSearchQuery: (query: string) => void;
    hydrateShowArchived: () => void;
    setLinkArchived: (id: string, archived: boolean) => Promise<void>;
}

function mapResponseToLinkItem(item: ShortLinkDTO): LinkItem {
    return {
        id: item.id,
        title: item.title || DEFAULT_LINK_TITLE,
        key: item.key,
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
    showArchived: false,
    searchQuery: "",
    currentPage: 0,
    totalElements: 0,
    totalPages: 0,

    fetchLinks: async (page?: number) => {
        const requestedPage = Math.max(0, page ?? get().currentPage);
        if (get().loading) return;

        set({loading: true, error: null});
        try {
            const {showArchived, searchQuery} = get();
            const params = new URLSearchParams();
            params.set("page", String(requestedPage));
            params.set("size", String(DEFAULT_PAGE_SIZE));
            params.set("showArchived", String(showArchived));
            if (searchQuery) {
                params.set("search", searchQuery);
            }
            const res = await fetchWithAuth(
                `${API_ENDPOINTS.SHORTLINKS}?${params}`,
            );

            if (res.ok) {
                const data: PageDTO<ShortLinkDTO> = await res.json();
                const mapped = data.content.map(mapResponseToLinkItem);

                set({
                    links: mapped,
                    currentPage: data.number ?? requestedPage,
                    totalElements: data.totalElements ?? mapped.length,
                    totalPages: data.totalPages ?? 1,
                });
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

    clearError: () => set({error: null}),

    setShowArchived: (show) => {
        try {
            localStorage.setItem(SHOW_ARCHIVED_STORAGE_KEY, String(show));
        } catch (e) {
            logger.error("Failed to save showArchived to localStorage", e);
        }
        set({showArchived: show});
    },

    setSearchQuery: (query) => set({searchQuery: query}),

    hydrateShowArchived: () => {
        try {
            const stored = localStorage.getItem(SHOW_ARCHIVED_STORAGE_KEY);
            if (stored !== null) {
                set({showArchived: stored === "true"});
            }
        } catch (e) {
            logger.error("Failed to load showArchived from localStorage", e);
        }
    },

    setLinkArchived: async (id, archived) => {
        const link = get().links.find((item) => item.id === id);
        if (!link) {
            set({error: `Failed to update archive status: link not found`});
            return;
        }
        if (!link.key) {
            set({error: `Failed to update archive status: missing key`});
            return;
        }
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
                method: "PUT",
                body: JSON.stringify({
                    id: link.id,
                    title: link.title,
                    longUrl: link.longUrl,
                    key: link.key,
                    isActive: !archived,
                    tagIds: [...(link.tagIds ?? [])],
                }),
            });
            if (res.ok) {
                await get().fetchLinks();
            } else {
                set({error: `Failed to update archive status: ${res.status}`});
            }
        } catch (error) {
            logger.error("Error updating link archive status", error);
            set({error: error instanceof Error ? error.message : "Unknown error occurred"});
        }
    },
}));
