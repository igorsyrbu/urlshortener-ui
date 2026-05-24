"use client";

import {Tag} from "lucide-react";
import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";
import {Badge, BadgeVariant} from "@/components/ui/badge";

interface DeleteTagModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading: boolean;
    tagName?: string;
    tagColor?: BadgeVariant;
}

const TAG_DELETE_TITLE = "Delete this tag?";
const TAG_DELETE_DESCRIPTION = "Deleting the tag will remove it from all associated links. This action cannot be undone.";

interface TagPreviewCardProps {
    tagName: string;
    tagColor?: BadgeVariant;
}

function TagPreviewCard({tagName, tagColor}: TagPreviewCardProps) {
    return (
        <div
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 min-w-0 w-full overflow-hidden">
            <Badge
                variant={tagColor}
                className="inline-flex items-center justify-center rounded-md px-1.5 py-1.5 shrink-0"
            >
                <Tag className="size-3.5 shrink-0"/>
            </Badge>
            <span className="text-sm font-bold text-foreground truncate min-w-0" title={tagName}>
                {tagName}
            </span>
        </div>
    );
}

export function DeleteTagModal({tagName, tagColor, ...props}: DeleteTagModalProps) {
    const previewContent = tagName ? <TagPreviewCard tagName={tagName} tagColor={tagColor}/> : undefined;

    return (
        <DeleteConfirmationModal
            title={TAG_DELETE_TITLE}
            confirmLabel="Delete tag"
            description={TAG_DELETE_DESCRIPTION}
            previewContent={previewContent}
            confirmationValue={tagName}
            confirmationType="tag name"
            {...props}
        />
    );
}
