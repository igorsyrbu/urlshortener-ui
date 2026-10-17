"use client";

import {useSyncExternalStore} from "react";
import {MOBILE_BREAKPOINT_PX} from "@/lib/constants";

interface MediaQueryStore {
    subscribe: (onChange: () => void) => () => void;
    getSnapshot: () => boolean;
}

/** One store per query: every component asking the same question shares one `MediaQueryList` and listener. */
const mediaQueryStores = new Map<string, MediaQueryStore>();

function createMediaQueryStore(query: string): MediaQueryStore {
    let list: MediaQueryList | null = null;
    const listeners = new Set<() => void>();
    const notifyListeners = (): void => listeners.forEach((listener) => listener());

    return {
        subscribe(onChange) {
            if (listeners.size === 0) {
                list = window.matchMedia(query);
                list.addEventListener("change", notifyListeners);
            }
            listeners.add(onChange);
            return () => {
                listeners.delete(onChange);
                if (listeners.size > 0 || !list) return;
                list.removeEventListener("change", notifyListeners);
                list = null;
            };
        },
        getSnapshot: () => (list ?? window.matchMedia(query)).matches,
    };
}

function getMediaQueryStore(query: string): MediaQueryStore {
    const existingStore = mediaQueryStores.get(query);
    if (existingStore) return existingStore;
    const store = createMediaQueryStore(query);
    mediaQueryStores.set(query, store);
    return store;
}

/** The prerendered HTML cannot know the viewport; hydration starts from "no match", then React re-renders once. */
function getServerSnapshot(): boolean {
    return false;
}

/** The current match from the first client render on, updated when the viewport crosses the query. */
function useMediaQuery(query: string): boolean {
    const store = getMediaQueryStore(query);
    return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}

export function useIsDesktop(): boolean {
    return useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);
}

export function useIsMobile(): boolean {
    return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
}

export function usePrefersReducedMotion(): boolean {
    return useMediaQuery("(prefers-reduced-motion: reduce)");
}
