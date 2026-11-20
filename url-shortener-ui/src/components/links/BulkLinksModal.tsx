"use client";

import {LinkPreviewCard} from "@/components/links/DeleteLinkModal";
import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";
import {
    formatBulkActionConfirmLabel,
    formatBulkActionTitle,
    formatBulkDeletePhrase,
} from "@/lib/bulk-link-actions";
import {BULK_LINK_ACTION_COPY, LINK_SELECTION_COPY, type BulkLinkAction} from "@/lib/constants";
import type {LinkItem} from "@/lib/types";

interface BulkLinksModalProps {
    action: BulkLinkAction | null;
    links: readonly LinkItem[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

/** Confirms a bulk action with the list of its links; a delete must also be confirmed by typing a phrase. */
export function BulkLinksModal({action, links, open, onOpenChange, onConfirm}: BulkLinksModalProps) {
    if (!action) return null;

    const copy = BULK_LINK_ACTION_COPY[action];
    const isDelete = action === "delete";

    return (
        <DeleteConfirmationModal
            open={open}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            loading={false}
            title={formatBulkActionTitle(action, links.length)}
            description={copy.DESCRIPTION}
            confirmLabel={formatBulkActionConfirmLabel(action, links.length)}
            confirmLoadingLabel={copy.PROGRESS}
            confirmVariant={isDelete ? "destructive" : "default"}
            confirmationValue={isDelete ? formatBulkDeletePhrase(links.length) : undefined}
            confirmationType={LINK_SELECTION_COPY.CONFIRMATION_TYPE}
            previewContent={
                <ul aria-label={LINK_SELECTION_COPY.LINK_LIST} className="flex max-h-56 min-w-0 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {links.map((link) => (
                        <li key={link.id} className="min-w-0">
                            <LinkPreviewCard shortUrl={link.shortUrl} longUrl={link.longUrl}/>
                        </li>
                    ))}
                </ul>
            }
        />
    );
}
