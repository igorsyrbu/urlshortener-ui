import {create} from "zustand";
import {fetchWithAuth} from "@/lib/api";
import {LinkItem} from "@/lib/types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE, SHOW_ARCHIVED_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {ShortLinkDTO, PageDTO} from "@/lib/api-types";
import {createLatestRequestTracker} from "@/lib/latest-request";

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

const linksRequests = createLatestRequestTracker();

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
        const request = linksRequests.begin();
        const setIfLatest = (partial: Partial<LinkStore>): void => {
            if (request.isLatest()) set(partial);
        };

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
            const res = await fetchWithAuth(`${API_ENDPOINTS.SHORTLINKS}?${params}`, {signal: request.signal});

            if (res.ok) {
                const data: PageDTO<ShortLinkDTO> = await res.json();
                const mapped = data.content.map(mapResponseToLinkItem);
                const pagination = data.page ?? data;

                setIfLatest({
                    links: mapped,
                    currentPage: pagination.number ?? requestedPage,
                    totalElements: pagination.totalElements ?? mapped.length,
                    totalPages: pagination.totalPages ?? 1,
                });
            } else {
                setIfLatest({error: `Failed to fetch links: ${res.status}`});
            }
        } catch (error) {
            if (request.signal.aborted) return;
            logger.error("Error fetching links", error);
            setIfLatest({error: error instanceof Error ? error.message : "Unknown error occurred"});
        } finally {
            setIfLatest({loading: false});
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
