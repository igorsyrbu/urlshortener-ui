"use client";

import {Archive, Check} from "lucide-react";
import {LinkFavicon} from "@/components/links/LinkFavicon";
import {FOCUS_RING_CLASS, LINK_SELECTION_COPY} from "@/lib/constants";
import type {LinkItem} from "@/lib/types";
import {cn} from "@/lib/utils";

interface LinkCardAvatarProps {
    link: LinkItem;
    isSelected: boolean;
    /** Shows the empty selection circle without hover, as select mode does. */
    isSelectMode?: boolean;
    /** Without it the avatar is only an icon and the link cannot be selected. */
    onSelectToggle?: (link: LinkItem) => void;
}

const AVATAR_CLASS =
    "relative shrink-0 size-9 rounded-full flex items-center justify-center border-[0.5px] border-border overflow-hidden bg-muted text-foreground transition-all duration-200";

function LinkAvatarIcon({link}: {link: LinkItem}) {
    return link.isActive ? <LinkFavicon longUrl={link.longUrl}/> : <Archive className="size-5"/>;
}

/**
 * The favicon (or archive icon) that turns into an empty selection circle while the card (a `group`) is under the
 * pointer or the circle has keyboard focus. Only a click on the circle selects the link. The favicon stays mounted
 * while the link is selected, so deselecting shows it again without reloading the image.
 */
export function LinkCardAvatar({link, isSelected, isSelectMode = false, onSelectToggle}: LinkCardAvatarProps) {
    if (!onSelectToggle) {
        return (
            <div className={AVATAR_CLASS}>
                <LinkAvatarIcon link={link}/>
            </div>
        );
    }

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={LINK_SELECTION_COPY.SELECT(link.shortUrl)}
            onClick={() => onSelectToggle(link)}
            className={cn(AVATAR_CLASS, "group/select cursor-pointer outline-none", FOCUS_RING_CLASS,
                isSelected && "border-transparent bg-transparent")}
        >
            <span className={cn("flex size-full items-center justify-center group-hover:hidden group-focus-visible/select:hidden",
                (isSelected || isSelectMode) && "hidden")}>
                <LinkAvatarIcon link={link}/>
            </span>
            {isSelected ? (
                <span className="check-ring-in flex size-full items-center justify-center rounded-full border-3 border-card-foreground text-card-foreground">
                    <Check className="check-draw size-4.5" strokeWidth={3.5}/>
                </span>
            ) : (
                <span aria-hidden="true"
                      className={cn("hidden size-full rounded-full border-3 border-muted-foreground group-hover:block group-focus-visible/select:block",
                          isSelectMode && "block")}/>
            )}
        </button>
    );
}
