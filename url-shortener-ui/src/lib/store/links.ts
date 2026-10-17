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
    /** Updates the list at once, then saves; restores the list and resolves `false` when the server refuses. */
    setLinkArchived: (id: string, archived: boolean) => Promise<boolean>;
    /** Shows a link the server has just saved, then reloads the page quietly to pick up any server-side changes. */
    applySavedLink: (link: LinkItem) => void;
    /** Removes the link from the list at once, then deletes it; restores the list and resolves `false` on failure. */
    deleteLink: (id: string) => Promise<boolean>;
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

async function saveArchiveStatus(link: LinkItem, archived: boolean): Promise<boolean> {
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
        if (!res.ok) logger.error("Failed to update link archive status", undefined, {status: res.status, linkId: link.id});
        return res.ok;
    } catch (error) {
        logger.error("Error updating link archive status", error);
        return false;
    }
}

async function deleteShortLink(linkId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_ENDPOINTS.SHORTLINKS}/${linkId}`, {method: "DELETE"});
        if (!res.ok) logger.error("Failed to delete link", undefined, {status: res.status, linkId});
        return res.ok;
    } catch (error) {
        logger.error("Error deleting link", error, {linkId});
        return false;
    }
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
        const {links, totalElements, showArchived} = get();
        const link = links.find((item) => item.id === id);
        if (!link?.key) {
            logger.error("Cannot update archive status of an unknown link", undefined, {linkId: id});
            return false;
        }
        // Without "show archived" an archived link leaves the list; with it the link stays and changes state.
        const leavesList = archived && !showArchived;
        set(leavesList
            ? {links: links.filter((item) => item.id !== id), totalElements: totalElements - 1}
            : {links: links.map((item) => (item.id === id ? {...item, isActive: !archived} : item))});
        const isSaved = await saveArchiveStatus(link, archived);
        if (!isSaved) set({links, totalElements});
        void get().fetchLinks();
        return isSaved;
    },

    applySavedLink: (savedLink) => {
        const title = savedLink.title.trim() ? savedLink.title : DEFAULT_LINK_TITLE;
        set({links: get().links.map((item) => (item.id === savedLink.id ? {...savedLink, title} : item))});
        void get().fetchLinks();
    },

    deleteLink: async (id) => {
        const {links, totalElements} = get();
        set({links: links.filter((item) => item.id !== id), totalElements: totalElements - 1});
        const isDeleted = await deleteShortLink(id);
        if (!isDeleted) set({links, totalElements});
        void get().fetchLinks();
        return isDeleted;
    },
}));
