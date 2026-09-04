"use client";

import { ShieldCheck } from "lucide-react";

interface UrlCleanerSuccessBannerProps {
    trackerCount: number;
}

export function UrlCleanerSuccessBanner({ trackerCount }: UrlCleanerSuccessBannerProps) {
    const label = trackerCount === 1 ? "1 tracker removed" : `${trackerCount} trackers removed`;

    return (
        <div className="flex min-h-8 items-center gap-2 bg-transparent px-1 text-success">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium leading-none">{label}</span>
        </div>
    );
}
