"use client";

import {useAnnouncerStore} from "@/lib/store/announcer";

/** The single polite live region for transient confirmations; mounted once in the root layout. */
export function LiveAnnouncer() {
    const message = useAnnouncerStore((state) => state.message);
    const sequence = useAnnouncerStore((state) => state.sequence);
    return (
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            <span key={sequence}>{message}</span>
        </div>
    );
}
