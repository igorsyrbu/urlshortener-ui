"use client";

import { useState } from "react";
import { Info, ShieldAlert } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { URL_CLEANER_TOOLTIP } from "@/lib/constants";

interface UrlCleanerBannerProps {
    trackerCount: number;
    onClean: () => void;
    onReview: () => void;
}

export function UrlCleanerBanner({ trackerCount, onClean, onReview }: UrlCleanerBannerProps) {
    const label = trackerCount === 1 ? "1 tracker detected" : `${trackerCount} trackers detected`;
    const [open, setOpen] = useState(false);

    return (
        <div className="flex min-h-8 items-center gap-2 bg-transparent px-1 text-foreground">
            <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 inline-flex items-center gap-1.5 text-sm font-medium leading-none">
                {label}
                <Tooltip open={open} onOpenChange={setOpen}>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="About tracker removal"
                            onClick={() => setOpen((v) => !v)}
                            onBlur={() => setOpen(false)}
                            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none translate-y-px"
                        >
                            <Info className="size-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent
                        side="top"
                        sideOffset={8}
                        className="max-w-64 rounded-xl bg-foreground px-4 py-3 text-sm font-normal leading-5 text-background shadow-lg border-foreground text-pretty text-left"
                        onPointerDownOutside={() => setOpen(false)}
                    >
                        {URL_CLEANER_TOOLTIP}
                        <TooltipPrimitive.Arrow className="fill-foreground" width={10} height={5} />
                    </TooltipContent>
                </Tooltip>
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
                <Button type="button" variant="ghost" size="xs" className="text-sm" onClick={onReview} aria-label="Review trackers">
                    Review
                </Button>
                <Button type="button" variant="outline" size="xs" className="text-sm" onClick={onClean} aria-label="Clean trackers from URL">
                    Clean
                </Button>
            </div>
        </div>
    );
}
