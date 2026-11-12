"use client";

import {LinkFormModal} from "@/components/links/LinkFormModal";
import type {LinkFormSubmit} from "@/components/links/create-link-types";
import {useEditableLink} from "@/lib/hooks/useEditableLink";
import {updateShortLink} from "@/lib/links-api";
import {LinkItem} from "@/lib/types";
import {withShortKey} from "@/lib/url-utils";

interface EditLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    link: LinkItem | null;
    /** Called with the link as saved, so the list can show it before it reloads. */
    onSuccess: (savedLink: LinkItem) => void;
}

/** Edits the link as the server has it now: a list item lacks the password, and the update replaces the whole link. */
export function EditLinkModal({open, onOpenChange, link, onSuccess}: EditLinkModalProps) {
    const {link: editableLink, isLoading, hasFailed, retry} = useEditableLink(link?.id ?? null, open);

    const handleSubmit: LinkFormSubmit = async (longUrl, title, key, tagIds, password) => {
        if (!editableLink) throw new Error("No link to edit");

        await updateShortLink(editableLink, {longUrl, title, key, tagIds, password});
        onSuccess({
            id: editableLink.id,
            isActive: editableLink.isActive,
            longUrl,
            title,
            key,
            shortUrl: withShortKey(editableLink.shortUrl, key),
            isPasswordProtected: password !== null,
            tagIds: [...tagIds],
        });
    };

    return (
        <LinkFormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Edit Link"
            submitLabel="Save"
            submittingLabel="Saving..."
            initialLongUrl={editableLink?.longUrl}
            initialTitle={editableLink?.title}
            initialKey={editableLink?.key}
            initialTagIds={editableLink?.tagIds ? [...editableLink.tagIds] : undefined}
            initialPassword={editableLink?.password ?? null}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            hasLoadFailed={hasFailed}
            onRetry={retry}
            enableUrlCleaner
        />
    );
}
