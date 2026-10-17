"use client";

import {useSyncExternalStore} from "react";

function subscribeToNothing(): () => void {
    return () => undefined;
}

function isClient(): boolean {
    return true;
}

function isServer(): boolean {
    return false;
}

/**
 * `false` only while hydrating server HTML, `true` on every client render after that (no extra effect render). Use it
 * for values the server cannot know, such as the stored theme.
 */
export function useHasMounted(): boolean {
    return useSyncExternalStore(subscribeToNothing, isClient, isServer);
}
