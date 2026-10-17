"use client";

import dynamic from "next/dynamic";

function loadActionDrawer() {
    return import("@/components/ui/action-drawer").then((drawerModule) => drawerModule.ActionDrawer);
}

/** Starts the drawer download on pointer-down of the "more actions" button, a few frames before the tap opens it. */
export function preloadActionDrawer(): void {
    void loadActionDrawer();
}

export const LazyActionDrawer = dynamic(loadActionDrawer, {ssr: false});
