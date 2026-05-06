"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {Check, Copy, CornerDownRight, MoreHorizontal, PencilLine, QrCode, Trash2} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Kbd} from "@/components/ui/kbd";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {LinkFavicon} from "@/components/links/LinkFavicon";
import {LinkItem} from "@/lib/types";
import {getDomain} from "@/lib/url-utils";
import {COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";

interface LinkCardProps {
    link: LinkItem;
    onEdit: (link: LinkItem) => void;
    onDelete: (link: LinkItem) => void;
    onQrCode: (link: LinkItem) => void;
}

function getSafeDomain(longUrl: string): string {
    try {
        return getDomain(longUrl);
    } catch {
        return longUrl;
    }
}

export function LinkCard({link, onEdit, onDelete, onQrCode}: LinkCardProps) {
    const [copied, setCopied] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const SHORTCUT_KEY_CLASS = "ml-auto hidden sm:inline-flex min-w-5 max-w-5";

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
            className="group flex items-center p-4 md:p-5 rounded-xl bg-background border-[0.5px] border-border hover:border-ring/40 has-data-[state=open]:border-ring/40 dark:hover:bg-muted/50 dark:has-data-[state=open]:bg-muted/50 hover:drop-shadow-md has-data-[state=open]:drop-shadow-md transition-all duration-200 gap-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <div
                className="shrink-0 size-9 rounded-full flex items-center justify-center border-[0.5px] border-border overflow-hidden bg-muted text-foreground">
                <LinkFavicon longUrl={link.longUrl}/>
            </div>

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
                <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="p-1 px-1.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none -mr-1">
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
            </div>
        </div>
    );
}
