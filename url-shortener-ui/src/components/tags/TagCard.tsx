"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Link, MoreVertical, PencilLine, Tag, Trash2} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Kbd} from "@/components/ui/kbd";
import {Badge} from "@/components/ui/badge";
import {TagItem} from "@/lib/types";
import {MOBILE_BREAKPOINT_PX, MORE_ACTIONS_BUTTON_CLASS, SHORTCUT_KEY_CLASS} from "@/lib/constants";
import {useMediaQuery} from "@/lib/hooks/useMediaQuery";
import {ActionDrawer} from "@/components/ui/action-drawer";

interface TagCardProps {
    tag: TagItem;
    onEdit: (tag: TagItem) => void;
    onDelete: (tag: TagItem) => void;
}

export function TagCard({tag, onEdit, onDelete}: TagCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);

    const linkCount = tag.linkCount ?? 0;

    const handleShortcut = useCallback(
        (event: KeyboardEvent) => {
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const isCardActive =
                isMenuOpen || cardRef.current?.matches(":hover");
            if (!isCardActive) return;

            if (event.key.toLowerCase() === "e") {
                event.preventDefault();
                setIsMenuOpen(false);
                onEdit(tag);
            } else if (event.key.toLowerCase() === "d") {
                event.preventDefault();
                setIsMenuOpen(false);
                onDelete(tag);
            }
        },
        [isMenuOpen, tag, onEdit, onDelete]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleShortcut);
        return () => document.removeEventListener("keydown", handleShortcut);
    }, [handleShortcut]);

    return (
        <div
            ref={cardRef}
            tabIndex={0}
            className="group flex items-center p-3 md:p-4 rounded-xl bg-background border-[0.5px] border-border dark:hover:bg-muted/50 dark:has-data-[state=open]:bg-muted/50 hover:drop-shadow-md has-data-[state=open]:drop-shadow-md transition-all duration-200 gap-3 outline-none"
        >
            <div className="flex-1 min-w-0 flex items-center gap-3">
                <Badge
                    variant={tag.color as never}
                    className="inline-flex items-center justify-center rounded-md px-1.5 py-1.5 shrink-0"
                >
                    <Tag className="size-3.5 shrink-0"/>
                </Badge>
                <span className="text-sm font-medium text-foreground truncate">
                    {tag.name}
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {linkCount > 0 && (
                    <Badge
                        variant="secondary"
                        className="leading-relaxed select-none"
                    >
                        <Link className="size-3 mr-1 shrink-0"/>
                        {linkCount} {linkCount === 1 ? "link" : "links"}
                    </Badge>
                )}
                {isDesktop ? (
                    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={MORE_ACTIONS_BUTTON_CLASS}
                                aria-label="More actions for tag"
                            >
                                <MoreVertical className="size-5"/>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="sm:min-w-40">
                            <DropdownMenuItem onClick={() => onEdit(tag)}>
                                <PencilLine className="size-4 mr-2"/>
                                Edit
                                <Kbd className={SHORTCUT_KEY_CLASS}>E</Kbd>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                                onClick={() => onDelete(tag)}
                                variant="destructive"
                            >
                                <Trash2 className="size-4 mr-2"/>
                                Delete
                                <Kbd className={SHORTCUT_KEY_CLASS}>D</Kbd>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <>
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className={MORE_ACTIONS_BUTTON_CLASS}
                            aria-label="More actions for tag"
                        >
                            <MoreVertical className="size-5"/>
                        </button>
                        <ActionDrawer
                            open={isMenuOpen}
                            onOpenChange={setIsMenuOpen}
                            actions={[
                                {
                                    label: "Edit",
                                    icon: PencilLine,
                                    onClick: () => onEdit(tag),
                                },
                                {
                                    label: "Delete",
                                    icon: Trash2,
                                    onClick: () => onDelete(tag),
                                    variant: "destructive",
                                    hasSeparator: true,
                                },
                            ]}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
