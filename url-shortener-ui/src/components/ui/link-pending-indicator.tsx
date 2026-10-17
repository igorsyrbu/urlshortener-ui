"use client";

import {useLinkStatus} from "next/link";
import {cn} from "@/lib/utils";

interface LinkPendingIndicatorProps {
    className?: string;
}

/**
 * A dot inside a `next/link` that appears while that link's navigation is pending. The 150 ms transition delay keeps
 * it hidden on fast navigations; it is always rendered, so showing it never moves the layout.
 */
export function LinkPendingIndicator({className}: LinkPendingIndicatorProps) {
    const {pending: isPending} = useLinkStatus();
    return (
        <span
            aria-hidden="true"
            data-state={isPending ? "pending" : "idle"}
            className={cn(
                "size-1.5 shrink-0 rounded-full bg-current transition-opacity",
                isPending ? "opacity-70 delay-150" : "opacity-0",
                className,
            )}
        />
    );
}
