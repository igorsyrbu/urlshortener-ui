"use client";

import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";

interface DeleteTagModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading: boolean;
    tagName?: string;
}

export function DeleteTagModal({tagName, ...props}: DeleteTagModalProps) {
    return (
        <DeleteConfirmationModal
            title="Delete Tag"
            confirmLabel="Delete Tag"
            entityName={tagName}
            {...props}
        />
    );
}
