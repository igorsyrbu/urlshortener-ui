"use client";

import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {LinkFormFields} from "@/components/links/LinkFormFields";

interface LinkFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    submitLabel: string;
    submittingLabel: string;
    initialLongUrl?: string;
    initialTitle?: string;
    initialTagIds?: string[];
    onSubmit: (longUrl: string, title: string, tagIds: string[]) => Promise<void>;
}

export function LinkFormModal({
    open,
    onOpenChange,
    title,
    submitLabel,
    submittingLabel,
    initialLongUrl,
    initialTitle,
    initialTagIds,
    onSubmit,
}: LinkFormModalProps) {
    const handleSubmit = async (longUrl: string, title: string, tagIds: string[]) => {
        await onSubmit(longUrl, title, tagIds);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className="sm:max-w-106.25 sm:rounded-2xl backdrop-blur-md bg-background/95 border-border gap-0 p-0"
            >
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6">
                    <LinkFormFields
                        initialLongUrl={initialLongUrl}
                        initialTitle={initialTitle}
                        initialTagIds={initialTagIds}
                        onSubmit={handleSubmit}
                        submitLabel={submitLabel}
                        submittingLabel={submittingLabel}
                        onCancel={() => onOpenChange(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
