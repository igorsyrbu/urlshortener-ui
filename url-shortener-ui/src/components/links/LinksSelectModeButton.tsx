"use client";

import {CircleCheck, X} from "lucide-react";
import {FLOATING_BAR_SURFACE_CLASS} from "@/components/links/LinksBottomBar";
import {Button} from "@/components/ui/button";
import {LINK_SELECTION_COPY} from "@/lib/constants";
import {cn} from "@/lib/utils";

interface LinksSelectModeButtonProps {
    isSelectMode: boolean;
    onStart: () => void;
    onCancel: () => void;
}

const ICON_SWAP_CLASS = "size-5 animate-in fade-in spin-in-90 zoom-in-50 duration-200 motion-reduce:animate-none";

/** The round button beside the bar on phones, which have no hover: it starts select mode, then turns into a cross. */
export function LinksSelectModeButton({isSelectMode, onStart, onCancel}: LinksSelectModeButtonProps) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={isSelectMode ? onCancel : onStart}
            aria-label={isSelectMode ? LINK_SELECTION_COPY.CANCEL : LINK_SELECTION_COPY.START}
            className={cn("size-10.5 rounded-full", FLOATING_BAR_SURFACE_CLASS)}
        >
            {isSelectMode ? (
                <X key="cancel" className={ICON_SWAP_CLASS}/>
            ) : (
                <CircleCheck key="start" className={ICON_SWAP_CLASS}/>
            )}
        </Button>
    );
}
