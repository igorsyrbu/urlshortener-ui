import {create} from "zustand";
import {SHORTCUTS_ENABLED_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";

interface ShortcutsStore {
    /** Single-key shortcuts (WCAG 2.1.4 asks for a way to turn them off). On by default. */
    isEnabled: boolean;
    setEnabled: (isEnabled: boolean) => void;
    /** Reads the stored choice; called after hydration, so the first client render matches the prerendered page. */
    hydrate: () => void;
}

const DISABLED_VALUE = "false";

export const useShortcutsStore = create<ShortcutsStore>((set) => ({
    isEnabled: true,

    setEnabled: (isEnabled) => {
        set({isEnabled});
        try {
            localStorage.setItem(SHORTCUTS_ENABLED_STORAGE_KEY, String(isEnabled));
        } catch (error) {
            logger.error("Failed to save the keyboard shortcuts preference", error);
        }
    },

    hydrate: () => {
        try {
            set({isEnabled: localStorage.getItem(SHORTCUTS_ENABLED_STORAGE_KEY) !== DISABLED_VALUE});
        } catch (error) {
            logger.error("Failed to read the keyboard shortcuts preference", error);
        }
    },
}));
