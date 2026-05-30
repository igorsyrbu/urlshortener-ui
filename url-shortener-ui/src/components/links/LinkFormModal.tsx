"use client";

import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {useMediaQuery} from "@/lib/hooks/useMediaQuery";
import {MOBILE_BREAKPOINT_PX} from "@/lib/constants";
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
    const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const handleSubmit = async (longUrl: string, title: string, tagIds: string[]) => {
        await onSubmit(longUrl, title, tagIds);
        onOpenChange(false);
    };

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-106.25 sm:rounded-2xl backdrop-blur-md bg-background/95 border-border gap-0 p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">{title}</DialogTitle>
                    <DialogDescription className="sr-only">Form to edit or create short link</DialogDescription>
                    <DialogHeader className="p-6 pb-4">
                        <h2 className="text-lg font-semibold leading-none">{title}</h2>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        <LinkFormFields
                            title={title}
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

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="p-0 outline-hidden">
                <DrawerTitle className="sr-only">{title}</DrawerTitle>
                <DrawerDescription className="sr-only">Form to edit or create short link</DrawerDescription>
                <div className="px-6 pb-6 pt-6">
                    <LinkFormFields
                        title={title}
                        initialLongUrl={initialLongUrl}
                        initialTitle={initialTitle}
                        initialTagIds={initialTagIds}
                        onSubmit={handleSubmit}
                        submitLabel={submitLabel}
                        submittingLabel={submittingLabel}
                        onCancel={() => onOpenChange(false)}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    );
}
