import { create } from "zustand";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackerMode = "disabled" | "suggest" | "auto-clean";

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface PreferencesStore {
    trackerMode: TrackerMode;
    setTrackerMode: (mode: TrackerMode) => void;
    /** Seam for future backend wiring: fetch persisted preferences. No-op for now (in-memory). */
    fetchPreferences: () => Promise<void>;
    /** Seam for future backend wiring: persist preference. In-memory now. */
    updatePreferences: (mode: TrackerMode) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
    trackerMode: "suggest",

    setTrackerMode: (mode) => set({ trackerMode: mode }),

    fetchPreferences: async () => {
        logger.info("Preferences fetch skipped (in-memory mode)", {
            trackerMode: "suggest",
        });
    },

    updatePreferences: async (mode) => {
        logger.info("Preferences update skipped (in-memory mode)", { trackerMode: mode });
        set({ trackerMode: mode });
    },
}));
