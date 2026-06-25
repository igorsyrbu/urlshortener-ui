"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    Archive,
    ArchiveRestore,
    Check,
    Copy,
    CornerDownRight,
    MoreVertical,
    PencilLine,
    QrCode,
    Tag,
    Trash2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Kbd} from "@/components/ui/kbd";
import {Badge} from "@/components/ui/badge";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {LinkFavicon} from "@/components/links/LinkFavicon";
import {TagBadge} from "@/components/tags/TagBadge";
import {LinkItem, TagItem} from "@/lib/types";
import {cn} from "@/lib/utils";
import {getDomain} from "@/lib/url-utils";
import {
    COPY_FEEDBACK_DURATION_MS,
    MOBILE_BREAKPOINT_PX,
    MORE_ACTIONS_BUTTON_CLASS,
    SHORTCUT_KEY_CLASS
} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useMediaQuery} from "@/lib/hooks/useMediaQuery";
import {ActionDrawer} from "@/components/ui/action-drawer";

interface LinkCardProps {
    link: LinkItem;
    onEdit: (link: LinkItem) => void;
    onDelete: (link: LinkItem) => void;
    onQrCode: (link: LinkItem) => void;
    onArchiveToggle?: (link: LinkItem) => void;
    onArchiveRequest?: (link: LinkItem) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

function getSafeDomain(longUrl: string): string {
    try {
        return getDomain(longUrl);
    } catch {
        return longUrl;
    }
}

function TagsSection({tags}: { tags: TagItem[] }) {
    const [isHovering, setIsHovering] = useState(false);
    const first = tags[0];
    const hidden = tags.slice(1);

    return (
        <div className="relative inline-flex items-center">
            {/* Mobile: icon-only badge */}
            <Badge
                variant={first.color as never}
                className="inline-flex items-center justify-center rounded-md px-1.5 py-1.5 sm:hidden"
            >
                <Tag className="size-3.5 shrink-0"/>
            </Badge>

            {/* Desktop */}
            {tags.length === 1 ? (
                <div className="hidden sm:block">
                    <TagBadge tag={first}/>
                </div>
            ) : (
                <div
                    className="hidden sm:inline-flex"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <TagBadge tag={first} className="cursor-default min-w-0">
                        <span className="opacity-50 mx-1 shrink-0">|</span>
                        <span className="shrink-0">+{hidden.length}</span>
                    </TagBadge>
                    {isHovering && (
                        <div
                            className="absolute bottom-full right-0 mb-1.5 flex items-center gap-2 z-50 bg-background border-[0.5px] border-border rounded-md px-2 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] whitespace-nowrap">
                            {hidden.map((tag) => (
                                <TagBadge key={tag.name} tag={tag}/>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function LinkCard({
                             link,
                             onEdit,
                             onDelete,
                             onQrCode,
                             onArchiveToggle,
                             onArchiveRequest,
                             onMouseEnter,
                             onMouseLeave
                         }: LinkCardProps) {
    const [copied, setCopied] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const storeTags = useTagStoreWithoutCount((state) => state.tags);
    const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);

    const resolvedTags = useMemo(
        () => (link.tagIds ?? [])
            .map((id) => storeTags.find((t) => t.id === id))
            .filter((t): t is TagItem => t != null)
            .sort((a, b) => a.name.localeCompare(b.name)),
        [link.tagIds, storeTags],
    );

    const handleCopy = () => {
        navigator.clipboard.writeText(link.shortUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    };

    const handleShortcut = useCallback((event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

        const isCardActive = isMenuOpen || cardRef.current?.matches(":hover");
        if (!isCardActive) return;

        if (event.key.toLowerCase() === "e") {
            event.preventDefault();
            setIsMenuOpen(false);
            onEdit(link);
        } else if (event.key.toLowerCase() === "d") {
            event.preventDefault();
            setIsMenuOpen(false);
            onDelete(link);
        } else if (event.key.toLowerCase() === "q") {
            event.preventDefault();
            setIsMenuOpen(false);
            onQrCode(link);
        }
    }, [isMenuOpen, link, onEdit, onDelete, onQrCode]);

    useEffect(() => {
        document.addEventListener("keydown", handleShortcut);
        return () => document.removeEventListener("keydown", handleShortcut);
    }, [handleShortcut]);

    return (
        <div
            ref={cardRef}
            tabIndex={0}
            data-link-id={link.id}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={cn(
                "group flex items-center p-4 md:p-5 rounded-xl bg-background border-[0.5px] border-border dark:hover:bg-muted/50 dark:has-data-[state=open]:bg-muted/50 hover:drop-shadow-md has-data-[state=open]:drop-shadow-md transition-all duration-200 gap-4 outline-none",
            )}>
            {link.isActive ? (
                <div
                    className="relative shrink-0 size-9 rounded-full flex items-center justify-center border-[0.5px] border-border overflow-hidden bg-muted text-foreground">
                    <div className="size-full flex items-center justify-center">
                        <LinkFavicon longUrl={link.longUrl}/>
                    </div>
                </div>
            ) : (
                <div
                    className="relative shrink-0 size-9 rounded-full flex items-center justify-center border-[0.5px] border-border overflow-hidden bg-muted text-foreground transition-all duration-200">
                    <Archive className="size-5"/>
                </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h3 className="text-sm font-bold text-card-foreground leading-tight pt-0.5 truncate">{link.title}</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 mt-0.5 min-w-0">
                    <div className="flex items-center gap-1 min-w-0 shrink">
                        <span className="text-[11px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded truncate">
                            {link.shortUrl}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center size-5 text-muted-foreground hover:text-foreground transition-all shrink-0"
                            title="Copy Link"
                            aria-label={copied ? "Link copied" : "Copy link to clipboard"}
                        >
                            {copied ? (
                                <Check className="size-3 text-success"/>
                            ) : (
                                <Copy className="size-3"/>
                            )}
                        </button>
                    </div>
                    <span className="hidden sm:inline-block text-muted-foreground/30 shrink-0">•</span>
                    <div className="flex items-center gap-1 min-w-0 shrink">
                        <CornerDownRight className="size-3 text-muted-foreground/70 sm:hidden shrink-0"/>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-[11px] text-muted-foreground truncate max-w-50">
                                    {getSafeDomain(link.longUrl)}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs">{link.longUrl}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {resolvedTags.length > 0 && (
                    <TagsSection tags={resolvedTags}/>
                )}
                {isDesktop ? (
                    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={MORE_ACTIONS_BUTTON_CLASS}
                                aria-label="More actions for link">
                                <MoreHorizontal className="size-5"/>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="sm:min-w-40">
                            <DropdownMenuItem onClick={() => onEdit(link)}>
                                <PencilLine className="size-4 mr-2"/>
                                Edit
                                <Kbd className={SHORTCUT_KEY_CLASS}>E</Kbd>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onQrCode(link)}>
                                <QrCode className="size-4 mr-2"/>
                                QR Code
                                <Kbd className={SHORTCUT_KEY_CLASS}>Q</Kbd>
                            </DropdownMenuItem>
                            {(onArchiveToggle || onArchiveRequest) && (
                                <DropdownMenuItem onClick={() => (onArchiveRequest ?? onArchiveToggle)?.(link)}>
                                    {link.isActive ? (
                                        <Archive className="size-4 mr-2"/>
                                    ) : (
                                        <ArchiveRestore className="size-4 mr-2"/>
                                    )}
                                    <span className="flex-1">{link.isActive ? "Archive" : "Unarchive"}</span>
                                    <Kbd className={SHORTCUT_KEY_CLASS}>A</Kbd>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem
                                onClick={() => onDelete(link)}
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
                            aria-label="More actions for link">
                            <MoreHorizontal className="size-5"/>
                        </button>
                        <ActionDrawer
                            open={isMenuOpen}
                            onOpenChange={setIsMenuOpen}
                            actions={[
                                {
                                    label: "Edit",
                                    icon: PencilLine,
                                    onClick: () => onEdit(link),
                                },
                                {
                                    label: "QR Code",
                                    icon: QrCode,
                                    onClick: () => onQrCode(link),
                                },
                                ...((onArchiveToggle || onArchiveRequest) ? [
                                    {
                                        label: link.isActive ? "Archive" : "Unarchive",
                                        icon: link.isActive ? Archive : ArchiveRestore,
                                        onClick: () => (onArchiveRequest ?? onArchiveToggle)?.(link),
                                    },
                                ] : []),
                                {
                                    label: "Delete",
                                    icon: Trash2,
                                    onClick: () => onDelete(link),
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
