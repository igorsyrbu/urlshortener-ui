"use client";

import {lazyDialog} from "@/lib/lazy-dialog";

function loadActionDrawer() {
    return import("@/components/ui/action-drawer").then((drawerModule) => drawerModule.ActionDrawer);
}

export const LazyActionDrawer = lazyDialog(loadActionDrawer);

/** Starts the drawer download on pointer-down of the "more actions" button, a few frames before the tap opens it. */
export function preloadActionDrawer(): void {
    void LazyActionDrawer.preload();
}
