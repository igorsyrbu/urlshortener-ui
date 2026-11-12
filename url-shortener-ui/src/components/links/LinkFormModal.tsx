"use client";

import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {LinkFormFields} from "@/components/links/LinkFormFields";
import type {LinkFormSubmit} from "@/components/links/create-link-types";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {Spinner} from "@/components/ui/spinner";
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
    /** The initial values are still loading: shows a spinner instead of the form. */
    isLoading?: boolean;
    /** Loading the initial values failed; `onRetry` loads them again. */
    hasLoadFailed?: boolean;
    onRetry?: () => void;
}

interface LinkFormLoadStateProps {
    hasLoadFailed: boolean;
    onRetry?: () => void;
}

/** Holds the form's place while the link loads, so the dialog keeps a steady size. */
function LinkFormLoadState({hasLoadFailed, onRetry}: LinkFormLoadStateProps) {
    if (hasLoadFailed) {
        return <ErrorWithRetry message={LINK_PASSWORD_COPY.LOAD_FAILED} onRetry={() => onRetry?.()} className="min-h-80"/>;
    }
    return (
        <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-3">
            <Spinner/>
            <span className="text-sm text-muted-foreground">{LINK_PASSWORD_COPY.LOADING}</span>
        </div>
    );
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
                                  hasLoadFailed = false,
                                  onRetry,
                              }: LinkFormModalProps) {
    const isDesktop = useIsDesktop();
    // New initial values remount the form, which resets every field, error and screen at once.
    const formKey = JSON.stringify([initialLongUrl, initialTitle, initialKey, initialTagIds, initialPassword]);
    const handleSubmit: LinkFormSubmit = async (longUrl, title, key, tagIds, password) => {
        await onSubmit(longUrl, title, key, tagIds, password);
        onOpenChange(false);
    };
    const isFormReady = !isLoading && !hasLoadFailed;

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
                    <div className="px-6 pb-6">
                        {isFormReady ? (
                            <LinkFormFields
                                key={formKey}
                                title={title}
                                initialLongUrl={initialLongUrl}
                                initialTitle={initialTitle}
                                initialTagIds={initialTagIds}
                                initialKey={initialKey}
                                initialPassword={initialPassword}
                                onSubmit={handleSubmit}
                                submitLabel={submitLabel}
                                submittingLabel={submittingLabel}
                                onCancel={() => onOpenChange(false)}
                                enableUrlCleaner={enableUrlCleaner}
                                enableTitleSuggestion={enableTitleSuggestion}
                            />
                        ) : (
                            <LinkFormLoadState hasLoadFailed={hasLoadFailed} onRetry={onRetry}/>
                        )}
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
                <div className="px-6 pt-6">
                    {isFormReady ? (
                        <LinkFormFields
                            key={formKey}
                            title={title}
                            initialLongUrl={initialLongUrl}
                            initialTitle={initialTitle}
                            initialTagIds={initialTagIds}
                            initialKey={initialKey}
                            initialPassword={initialPassword}
                            onSubmit={handleSubmit}
                            submitLabel={submitLabel}
                            submittingLabel={submittingLabel}
                            onCancel={() => onOpenChange(false)}
                            enableUrlCleaner={enableUrlCleaner}
                            enableTitleSuggestion={enableTitleSuggestion}
                        />
                    ) : (
                        <LinkFormLoadState hasLoadFailed={hasLoadFailed} onRetry={onRetry}/>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
