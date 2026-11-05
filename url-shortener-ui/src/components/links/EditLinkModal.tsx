"use client";

import {LinkFormModal} from "@/components/links/LinkFormModal";
import {updateShortLink} from "@/lib/links-api";
import {LinkItem} from "@/lib/types";
import {extractKeyFromShortUrl, withShortKey} from "@/lib/url-utils";

interface EditLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    link: LinkItem | null;
    /** Called with the link as saved, so the list can show it before it reloads. */
    onSuccess: (savedLink: LinkItem) => void;
}

export function EditLinkModal({open, onOpenChange, link, onSuccess}: EditLinkModalProps) {
    const handleSubmit = async (longUrl: string, title: string, key: string, tagIds: string[]) => {
        if (!link) throw new Error("No link to edit");

        await updateShortLink(link, {longUrl, title, key, tagIds});
        onSuccess({...link, longUrl, title, key, shortUrl: withShortKey(link.shortUrl, key), tagIds: [...tagIds]});
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
            initialKey={link?.key ?? extractKeyFromShortUrl(link?.shortUrl ?? "")}
            initialTagIds={link?.tagIds ? [...link.tagIds] : undefined}
            onSubmit={handleSubmit}
            enableUrlCleaner
        />
    );
}
