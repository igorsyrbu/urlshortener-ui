"use client";

import {LinkFormModal} from "@/components/links/LinkFormModal";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {LinkItem} from "@/lib/types";

interface EditLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    link: LinkItem | null;
    onSuccess: () => void;
}

export function EditLinkModal({open, onOpenChange, link, onSuccess}: EditLinkModalProps) {
    const handleSubmit = async (longUrl: string, title: string, tagIds: string[]) => {
        if (!link) throw new Error("No link to edit");

        const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
            method: "PUT",
            body: JSON.stringify({
                id: link.id,
                longUrl,
                title,
                shortUrl: link.shortUrl,
                isActive: link.isActive,
                tagIds: [...tagIds],
            }),
        });

        if (!res.ok) {
            throw new Error("Failed to update link");
        }

        onSuccess();
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
            initialTagIds={link?.tagIds ? [...link.tagIds] : undefined}
            onSubmit={handleSubmit}
        />
    );
}
