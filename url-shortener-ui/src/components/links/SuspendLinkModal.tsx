"use client";

import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";
import {LinkPreviewCard} from "@/components/links/DeleteLinkModal";
import {LinkItem} from "@/lib/types";

interface SuspendLinkModalProps {
    link: LinkItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading?: boolean;
}

export function SuspendLinkModal({link, open, onOpenChange, onConfirm, loading = false}: SuspendLinkModalProps) {
    if (!link) return null;

    const isSuspending = !link.isSuspended;
    const title = isSuspending ? "Suspend this link?" : "Resume this link?";
    const description = isSuspending
        ? "Suspended links show visitors a suspended page instead of the original URL and don't count clicks"
        : "Resumed links redirect visitors to the original URL again";
    const confirmLabel = isSuspending ? "Suspend link" : "Resume link";
    const confirmLoadingLabel = isSuspending ? "Suspending..." : "Resuming...";

    return (
        <DeleteConfirmationModal
            open={open}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            loading={loading}
            title={title}
            description={description}
            confirmLabel={confirmLabel}
            confirmLoadingLabel={confirmLoadingLabel}
            confirmVariant="default"
            previewContent={<LinkPreviewCard shortUrl={link.shortUrl} longUrl={link.longUrl}/>}
        />
    );
}
