import { create } from "zustand";
import { fetchWithAuth } from "@/lib/api";
import { API_ENDPOINTS, TRACKER_MODE } from "@/lib/constants";
import type { UrlCleanerMode, UserPreferences } from "@/lib/api-types";
import { logger } from "@/lib/logger";

export type TrackerMode = UrlCleanerMode;

function isTrackerMode(value: unknown): value is TrackerMode {
    return typeof value === "string" && (Object.values(TRACKER_MODE) as string[]).includes(value);
}

function parsePreferences(data: unknown): TrackerMode | null {
    if (typeof data !== "object" || data === null || !("urlCleanerMode" in data)) {
        return null;
    }
    // Unavoidable narrow: fetch payloads are untyped, the guard below validates the value.
    const mode = (data as { urlCleanerMode: unknown }).urlCleanerMode;
    return isTrackerMode(mode) ? mode : null;
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface PreferencesStore {
    /** Null until the first successful load; consumers must treat null as "not checked". */
    trackerMode: TrackerMode | null;
    hasLoaded: boolean;
    isLoading: boolean;
    isSaving: boolean;
    /** Loads once per session; resolves true when the server value is applied. */
    fetchPreferences: () => Promise<boolean>;
    updatePreferences: (mode: TrackerMode) => Promise<void>;
}

function applyServerMode(data: unknown, source: string): TrackerMode | null {
    const mode = parsePreferences(data);
    if (mode === null) {
        logger.warn("Invalid preferences payload, ignoring server value", { source });
    }
    return mode;
}

export const usePreferencesStore = create<PreferencesStore>((set, get) => ({
    trackerMode: null,
    hasLoaded: false,
    isLoading: false,
    isSaving: false,

    fetchPreferences: async () => {
        if (get().hasLoaded) return true;
        if (get().isLoading) return false;
        set({ isLoading: true });
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.USERS_ME_PREFERENCES);
            if (!res.ok) {
                logger.warn("Failed to load preferences", { status: res.status });
                return false;
            }
            const mode = applyServerMode(await res.json(), "fetch");
            if (mode === null) {
                return false;
            }
            set({ trackerMode: mode, hasLoaded: true });
            return true;
        } catch (error) {
            logger.warn("Failed to load preferences", { error: String(error) });
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    updatePreferences: async (mode) => {
        const previous = get().trackerMode;
        if (get().isSaving || previous === mode) return;
        set({ trackerMode: mode, isSaving: true });
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.USERS_ME_PREFERENCES, {
                method: "PUT",
                body: JSON.stringify({ urlCleanerMode: mode } satisfies UserPreferences),
            });
            if (!res.ok) {
                throw new Error(`Failed to save preferences: ${res.status}`);
            }
            const saved = applyServerMode(await res.json(), "update");
            set({ trackerMode: saved ?? mode, hasLoaded: true });
        } catch (error) {
            set({ trackerMode: previous });
            logger.error("Failed to save preferences, selection reverted", error);
            throw error;
        } finally {
            set({ isSaving: false });
        }
    },
}));
