"use client";

import {TagFormModal} from "@/components/tags/TagFormModal";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {TagItem} from "@/lib/types";
import {BadgeVariant} from "@/components/ui/badge";

interface EditTagModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tag: TagItem | null;
}

export function EditTagModal({open, onOpenChange, tag}: EditTagModalProps) {
    const {updateTag} = useTagMutations();

    const handleUpdate = async (name: string, color: string) => {
        if (!tag?.id) return;
        await updateTag(tag.id, name, color as BadgeVariant);
    };

    return (
        <TagFormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Edit Tag"
            submitLabel="Save"
            submittingLabel="Saving..."
            initialName={tag?.name}
            initialColor={tag?.color}
            onSubmit={handleUpdate}
        />
    );
}
