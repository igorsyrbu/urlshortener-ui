"use client";

import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";
import {LinkPreviewCard} from "@/components/links/DeleteLinkModal";
import {LinkItem} from "@/lib/types";

interface ArchiveLinkModalProps {
    link: LinkItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading?: boolean;
}

export function ArchiveLinkModal({link, open, onOpenChange, onConfirm, loading = false}: ArchiveLinkModalProps) {
    if (!link) return null;

    const isActive = link.isActive;
    const title = isActive ? "Archive this link?" : "Unarchive this link?";
    const description = isActive
        ? "Archived links are hidden from your list but keep redirecting visitors and counting clicks"
        : "Unarchived links show up in your list again";
    const confirmLabel = isActive ? "Archive link" : "Unarchive link";
    const confirmLoadingLabel = isActive ? "Archiving..." : "Unarchiving...";

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
