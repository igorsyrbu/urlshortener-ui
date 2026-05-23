"use client";

import {TagFormModal} from "@/components/tags/TagFormModal";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {BadgeVariant} from "@/components/ui/badge";

interface CreateTagModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTagModal({open, onOpenChange}: CreateTagModalProps) {
    const {createTag} = useTagMutations();

    const handleCreate = async (name: string, color: string) => {
        return createTag(name, color as BadgeVariant);
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
