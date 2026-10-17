"use client";

import dynamic from "next/dynamic";

function loadDateRangeDrawer() {
    return import("@/components/analytics/DateRangeDrawer").then((drawerModule) => drawerModule.DateRangeDrawer);
}

/** Starts the drawer download on the first touch of "Custom", a few frames before the click opens it. */
export function preloadDateRangeDrawer(): void {
    void loadDateRangeDrawer();
}

export const LazyDateRangeDrawer = dynamic(loadDateRangeDrawer, {ssr: false});
