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

/**
 * The form opens at once from the list item, which has everything but the password. The password and the link as the
 * server has it now load meanwhile: the password box shows a placeholder (when the list says the link is protected)
 * and saving waits, because the update replaces the whole link.
 */
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
            initialLongUrl={link?.longUrl}
            initialTitle={link?.title}
            initialKey={link?.key}
            initialTagIds={link?.tagIds ? [...link.tagIds] : undefined}
            initialPassword={editableLink?.password ?? null}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isPasswordLoading={isLoading && link?.isPasswordProtected === true}
            hasLoadFailed={hasFailed}
            onRetry={retry}
            enableUrlCleaner
        />
    );
}
