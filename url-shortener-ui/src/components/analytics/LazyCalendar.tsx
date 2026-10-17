"use client";

import dynamic from "next/dynamic";

function loadCalendar() {
    return import("@/components/ui/calendar").then((calendarModule) => calendarModule.Calendar);
}

/** Starts the calendar download early (hover or focus on "Custom") so the popover opens without waiting. */
export function preloadCalendar(): void {
    void loadCalendar();
}

export const LazyCalendar = dynamic(loadCalendar, {
    ssr: false,
    // The two-month range calendar's measured size, so the popover does not resize when the chunk arrives.
    loading: () => <div className="h-73.25 w-122.5" aria-hidden="true"/>,
});
