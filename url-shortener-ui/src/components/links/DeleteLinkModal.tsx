"use client";

import {CornerDownRight} from "lucide-react";
import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";
import {LinkFavicon} from "@/components/links/LinkFavicon";

interface DeleteLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading: boolean;
    linkTitle?: string;
    shortUrl?: string;
    longUrl?: string;
}

const LINK_DELETE_TITLE = "Delete this link?";
const LINK_DELETE_DESCRIPTION = "Deleting the link will remove all of its analytics. This action cannot be undone.";

function getHandleFromShortUrl(url?: string): string {
    if (!url) return "";
    try {
        const {pathname} = new URL(url);
        return pathname.startsWith("/") ? pathname.slice(1) : pathname;
    } catch {
        const parts = url.split("/");
        return parts[parts.length - 1] ?? "";
    }
}

interface LinkPreviewCardProps {
    shortUrl: string;
    longUrl: string;
}

function LinkPreviewCard({shortUrl, longUrl}: LinkPreviewCardProps) {
    return (
        <div
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 min-w-0 w-full overflow-hidden">
            <div
                className="shrink-0 size-8 rounded-full flex items-center justify-center border border-border overflow-hidden bg-muted text-foreground">
                <LinkFavicon longUrl={longUrl}/>
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-foreground truncate">{shortUrl}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
                    <CornerDownRight className="size-3 shrink-0"/>
                    <span className="truncate">{longUrl}</span>
                </span>
            </div>
        </div>
    );
}

export function DeleteLinkModal({linkTitle, shortUrl, longUrl, ...props}: DeleteLinkModalProps) {
    const handle = getHandleFromShortUrl(shortUrl);
    const previewContent =
        shortUrl && longUrl ? <LinkPreviewCard shortUrl={shortUrl} longUrl={longUrl}/> : undefined;

    return (
        <DeleteConfirmationModal
            title={LINK_DELETE_TITLE}
            confirmLabel="Delete link"
            description={LINK_DELETE_DESCRIPTION}
            previewContent={previewContent}
            confirmationValue={handle || undefined}
            confirmationType="short link handle"
            {...props}
        />
    );
}
