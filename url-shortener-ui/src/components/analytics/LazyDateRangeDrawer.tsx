"use client";

import {lazyDialog} from "@/lib/lazy-dialog";

function loadDateRangeDrawer() {
    return import("@/components/analytics/DateRangeDrawer").then((drawerModule) => drawerModule.DateRangeDrawer);
}

export const LazyDateRangeDrawer = lazyDialog(loadDateRangeDrawer);

/** Starts the drawer download on the first touch of "Custom", a few frames before the click opens it. */
export function preloadDateRangeDrawer(): void {
    void LazyDateRangeDrawer.preload();
}
