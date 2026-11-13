"use client";

import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {LinkFormFields} from "@/components/links/LinkFormFields";
import type {LinkFormSubmit} from "@/components/links/create-link-types";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {LINK_PASSWORD_COPY} from "@/lib/constants";

interface LinkFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    submitLabel: string;
    submittingLabel: string;
    initialLongUrl?: string;
    initialTitle?: string;
    initialTagIds?: string[];
    initialKey?: string;
    initialPassword?: string | null;
    onSubmit: LinkFormSubmit;
    enableUrlCleaner?: boolean;
    enableTitleSuggestion?: boolean;
    /** The link is still loading: the form shows its initial values at once, but saving waits. */
    isLoading?: boolean;
    /** The password is among what is still loading: its box shows a placeholder until it arrives. */
    isPasswordLoading?: boolean;
    /** Loading the link failed: the form gives way to an error; `onRetry` loads it again. */
    hasLoadFailed?: boolean;
    onRetry?: () => void;
}

interface LinkFormLoadFailedProps {
    onRetry?: () => void;
}

/** Holds the form's place when the link could not be loaded, so the dialog keeps a steady size. */
function LinkFormLoadFailed({onRetry}: LinkFormLoadFailedProps) {
    return <ErrorWithRetry message={LINK_PASSWORD_COPY.LOAD_FAILED} onRetry={() => onRetry?.()} className="min-h-80"/>;
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
                                  initialKey,
                                  initialPassword = null,
                                  onSubmit,
                                  enableUrlCleaner = false,
                                  enableTitleSuggestion = false,
                                  isLoading = false,
                                  isPasswordLoading = false,
                                  hasLoadFailed = false,
                                  onRetry,
                              }: LinkFormModalProps) {
    const isDesktop = useIsDesktop();
    // New initial values remount the form, which resets every field, error and screen at once. The password is left
    // out: it arrives later than the rest and the form takes it in place, so nothing typed meanwhile is lost.
    const formKey = JSON.stringify([initialLongUrl, initialTitle, initialKey, initialTagIds]);
    const handleSubmit: LinkFormSubmit = async (longUrl, title, key, tagIds, password) => {
        await onSubmit(longUrl, title, key, tagIds, password);
        onOpenChange(false);
    };
    const formBody = hasLoadFailed ? (
        <LinkFormLoadFailed onRetry={onRetry}/>
    ) : (
        <LinkFormFields
            key={formKey}
            title={title}
            initialLongUrl={initialLongUrl}
            initialTitle={initialTitle}
            initialTagIds={initialTagIds}
            initialKey={initialKey}
            initialPassword={initialPassword}
            isPasswordLoading={isPasswordLoading}
            isSubmitBlocked={isLoading}
            onSubmit={handleSubmit}
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            onCancel={() => onOpenChange(false)}
            enableUrlCleaner={enableUrlCleaner}
            enableTitleSuggestion={enableTitleSuggestion}
        />
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-106.25 border-border gap-0 p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">{title}</DialogTitle>
                    <DialogDescription className="sr-only">Form to edit or create short link</DialogDescription>
                    <DialogHeader className="p-6 pb-4">
                        <h2 className="text-lg font-semibold leading-none">{title}</h2>
                    </DialogHeader>
                    <div className="px-6 pb-6">{formBody}</div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="p-0 outline-hidden">
                <DrawerTitle className="sr-only">{title}</DrawerTitle>
                <DrawerDescription className="sr-only">Form to edit or create short link</DrawerDescription>
                <div className="px-6 pt-6">{formBody}</div>
            </DrawerContent>
        </Drawer>
    );
}
