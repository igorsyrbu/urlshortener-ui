"use client";

import {LinkFormModal} from "@/components/links/LinkFormModal";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {LinkItem} from "@/lib/types";
import {ShortKeyConflictError} from "@/components/links/create-link-types";

interface EditLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    link: LinkItem | null;
    onSuccess: () => void;
}

function extractKeyFromShortUrl(shortUrl: string): string {
    try {
        return new URL(shortUrl).pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {
        return shortUrl;
    }
}

export function EditLinkModal({open, onOpenChange, link, onSuccess}: EditLinkModalProps) {
    const handleSubmit = async (longUrl: string, title: string, key: string, tagIds: string[]) => {
        if (!link) throw new Error("No link to edit");

        const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
            method: "PUT",
            body: JSON.stringify({
                id: link.id,
                longUrl,
                title,
                key,
                isActive: link.isActive,
                tagIds: [...tagIds],
            }),
        });

        if (res.status === 409) {
            throw new ShortKeyConflictError();
        }

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
            initialKey={link?.key ?? extractKeyFromShortUrl(link?.shortUrl ?? "")}
            initialTagIds={link?.tagIds ? [...link.tagIds] : undefined}
            onSubmit={handleSubmit}
        />
    );
}
