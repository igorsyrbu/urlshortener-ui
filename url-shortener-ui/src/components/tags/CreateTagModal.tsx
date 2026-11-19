"use client";

import {TagFormModal} from "@/components/tags/TagFormModal";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {BadgeVariant} from "@/components/ui/badge";
import {TAG_CREATED_MESSAGE} from "@/lib/tag-constants";
import {toast} from "sonner";

interface CreateTagModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTagModal({open, onOpenChange}: CreateTagModalProps) {
    const {createTag} = useTagMutations();

    const handleCreate = async (name: string, color: BadgeVariant) => {
        const tag = await createTag(name, color);
        toast.success(TAG_CREATED_MESSAGE);
        return tag;
    };

    return (
        <TagFormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Create Tag"
            submitLabel="Create"
            submittingLabel="Creating..."
            onSubmit={handleCreate}
            resetOnClose
        />
    );
}
