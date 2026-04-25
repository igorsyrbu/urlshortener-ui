"use client";

import {useCallback, useEffect, useState} from "react";
import {Check, Copy, CornerDownRight} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
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
}

function getSafeDomain(longUrl: string): string {
    try {
        return getDomain(longUrl);
    } catch {
        return longUrl;
    }
}

export function LinkCard({link, onEdit, onDelete}: LinkCardProps) {
    const [copied, setCopied] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(link.shortUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    };

    const handleMenuShortcut = useCallback((event: KeyboardEvent) => {
        if (event.key.toLowerCase() === "e") {
            event.preventDefault();
            setIsMenuOpen(false);
            onEdit(link);
        } else if (event.key.toLowerCase() === "d") {
            event.preventDefault();
            setIsMenuOpen(false);
            onDelete(link);
        }
    }, [link, onEdit, onDelete]);

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        document.addEventListener("keydown", handleMenuShortcut);
        return () => document.removeEventListener("keydown", handleMenuShortcut);
    }, [isMenuOpen, handleMenuShortcut]);

    return (
        <div
            className="group flex items-center p-4 md:p-5 rounded-xl bg-background border-[0.5px] border-border hover:border-ring/40 has-data-[state=open]:border-ring/40 dark:hover:bg-muted/50 dark:has-data-[state=open]:bg-muted/50 hover:drop-shadow-md has-data-[state=open]:drop-shadow-md transition-all duration-200 gap-4">
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
                                <Check className="size-3 text-green-500"/>
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
                            <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="sm:min-w-40">
                        <DropdownMenuItem onClick={() => onEdit(link)}>
                            <span className="material-symbols-outlined text-sm mr-2">edit</span>
                            Edit
                            <Kbd className="ml-auto hidden sm:inline-flex">E</Kbd>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(link)}
                            className="text-destructive focus:text-destructive"
                        >
                            <span className="material-symbols-outlined text-sm mr-2">delete</span>
                            Delete
                            <Kbd className="ml-auto hidden sm:inline-flex">D</Kbd>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

