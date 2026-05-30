"use client";

import React, {useEffect, useState} from "react";
import {Check, Copy} from "lucide-react";
import {COPY_FEEDBACK_DURATION_MS, MOBILE_BREAKPOINT_PX} from "@/lib/constants";
import {Input} from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import {useMediaQuery} from "@/lib/hooks/useMediaQuery";
import {Button} from "@/components/ui/button";

interface DeleteConfirmationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading: boolean;
    title: string;
    description: string;
    warningText?: string;
    previewContent?: React.ReactNode;
    confirmLabel?: string;
    confirmLoadingLabel?: string;
    confirmationValue?: string;
    confirmationType?: string;
}

interface ConfirmationSectionProps {
    confirmationValue: string;
    confirmationType?: string;
    inputValue: string;
    onInputChange: (value: string) => void;
    disabled: boolean;
}

function ConfirmationSection({
                                 confirmationValue,
                                 confirmationType,
                                 inputValue,
                                 onInputChange,
                                 disabled,
                             }: ConfirmationSectionProps) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(confirmationValue);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), COPY_FEEDBACK_DURATION_MS);
        } catch (err) {
            console.error("Failed to copy confirmation text", err);
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full min-w-0 overflow-hidden">
            <p className="text-sm text-foreground w-full min-w-0">
                <span>To verify, type below </span>
                <strong className="font-bold break-all">{confirmationValue}</strong>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="ml-1 inline-flex items-center justify-center align-middle text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy to clipboard"
                >
                    {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-success"/>
                    ) : (
                        <Copy className="h-3.5 w-3.5"/>
                    )}
                </button>
            </p>
            <Input
                type="text"
                placeholder={`Type the ${confirmationType ?? "value"} here`}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                disabled={disabled}
                className="h-9 text-sm"
            />
        </div>
    );
}

export function DeleteConfirmationModal({
                                            open,
                                            onOpenChange,
                                            onConfirm,
                                            loading,
                                            title,
                                            description,
                                            warningText,
                                            previewContent,
                                            confirmLabel = "Delete",
                                            confirmLoadingLabel = "Deleting...",
                                            confirmationValue,
                                            confirmationType,
                                        }: DeleteConfirmationModalProps) {
    const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (!open) {
            setInputValue("");
        }
    }, [open]);

    const isConfirmed = !confirmationValue || inputValue === confirmationValue;

    const bodyContent = (
        <div className="flex flex-col gap-4 mt-3 sm:-mt-1 w-full min-w-0 overflow-hidden">
            <div className="flex flex-col gap-2">
                {isDesktop ? (
                    <DialogDescription className="text-sm text-foreground">{description}</DialogDescription>
                ) : (
                    <DrawerDescription className="text-sm text-foreground">{description}</DrawerDescription>
                )}
                {warningText && (
                    <p className="text-sm font-semibold text-foreground">{warningText}</p>
                )}
            </div>

            {previewContent}

            {confirmationValue && (
                <ConfirmationSection
                    confirmationValue={confirmationValue}
                    confirmationType={confirmationType}
                    inputValue={inputValue}
                    onInputChange={setInputValue}
                    disabled={loading}
                />
            )}
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="sm:max-w-106.25 sm:rounded-2xl backdrop-blur-md bg-background/95 border-border"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>

                    {bodyContent}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onConfirm}
                            disabled={loading || !isConfirmed}
                        >
                            {loading ? confirmLoadingLabel : confirmLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="outline-hidden px-6 pb-6 gap-4">
                <DrawerHeader className="p-0 text-center">
                    <DrawerTitle>{title}</DrawerTitle>
                </DrawerHeader>

                {bodyContent}

                <DrawerFooter className="p-0 mt-4 flex flex-col gap-2">
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={loading || !isConfirmed}
                        className="w-full"
                    >
                        {loading ? confirmLoadingLabel : confirmLabel}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

