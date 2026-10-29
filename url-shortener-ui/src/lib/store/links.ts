import {create} from "zustand";
import {SHOW_ARCHIVED_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";

/** The links list's filters. The links themselves are server state: see `useLinksPage`. */
interface LinkStore {
    showArchived: boolean;
    /** False until `hydrateShowArchived` has read the saved choice, so the first request uses it instead of `false`. */
    isShowArchivedHydrated: boolean;
    /** The committed search, shared with the export dialog; empty for none. */
    searchQuery: string;
    setShowArchived: (show: boolean) => void;
    setSearchQuery: (query: string) => void;
    hydrateShowArchived: () => void;
}

function readStoredShowArchived(): boolean | null {
    try {
        const stored = localStorage.getItem(SHOW_ARCHIVED_STORAGE_KEY);
        return stored === null ? null : stored === "true";
    } catch (error) {
        logger.error("Failed to load showArchived from localStorage", error);
        return null;
    }
}

export const useLinkStore = create<LinkStore>((set) => ({
    showArchived: false,
    isShowArchivedHydrated: false,
    searchQuery: "",

    setShowArchived: (show) => {
        try {
            localStorage.setItem(SHOW_ARCHIVED_STORAGE_KEY, String(show));
        } catch (error) {
            logger.error("Failed to save showArchived to localStorage", error);
        }
        set({showArchived: show});
    },

    setSearchQuery: (query) => set({searchQuery: query}),

    hydrateShowArchived: () => {
        const stored = readStoredShowArchived();
        set(stored === null ? {isShowArchivedHydrated: true} : {showArchived: stored, isShowArchivedHydrated: true});
    },
}));
