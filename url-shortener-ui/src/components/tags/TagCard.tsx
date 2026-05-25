"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Link, MoreHorizontal, PencilLine, Tag, Trash2} from "lucide-react";
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
import {SHORTCUT_KEY_CLASS} from "@/lib/constants";

interface TagCardProps {
    tag: TagItem;
    onEdit: (tag: TagItem) => void;
    onDelete: (tag: TagItem) => void;
}

export function TagCard({tag, onEdit, onDelete}: TagCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

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
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="p-1 px-1.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none -mr-1"
                        >
                            <MoreHorizontal className="size-5"/>
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
            </div>
        </div>
    );
}
