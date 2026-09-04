"use client";

import React, {useEffect, useRef, useState} from "react";
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
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {EnterKbd} from "@/components/ui/enter-kbd";
import {TagColorPicker} from "@/components/tags/TagColorPicker";
import {BadgeVariant} from "@/components/ui/badge";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";

interface TagFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    submitLabel: string;
    submittingLabel: string;
    initialName?: string;
    initialColor?: BadgeVariant;
    onSubmit: (name: string, color: BadgeVariant) => void | Promise<unknown>;
    resetOnClose?: boolean;
}

export function TagFormModal({
                                 open,
                                 onOpenChange,
                                 title,
                                 submitLabel,
                                 submittingLabel,
                                 initialName = "",
                                 initialColor = ALLOWED_TAG_COLORS[0],
                                 onSubmit,
                                 resetOnClose = false,
                             }: TagFormModalProps) {
    const [name, setName] = useState(initialName);
    const [selectedColor, setSelectedColor] = useState<BadgeVariant>(initialColor);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isDesktop = useIsDesktop();

    useEffect(() => {
        if (open) {
            setName(initialName);
            setSelectedColor(initialColor);
            setIsSubmitting(false);
        }
    }, [open, initialName, initialColor]);

    useEffect(() => {
        if (!open || !isDesktop) return;
        if (initialName) return;
        const frame = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open, isDesktop, initialName]);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name.trim(), selectedColor);
            onOpenChange(false);
        } catch {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (value: boolean) => {
        if (!value && resetOnClose) {
            setName("");
            setSelectedColor(ALLOWED_TAG_COLORS[0]);
        }
        onOpenChange(value);
    };

    const handleCancel = () => {
        if (resetOnClose) {
            setName("");
            setSelectedColor(ALLOWED_TAG_COLORS[0]);
        }
        onOpenChange(false);
    };

    const formFields = (
        <>
            <div className="grid gap-2">
                <label htmlFor="tag-name" className="text-sm font-medium">
                    Name
                </label>
                <Input
                    ref={inputRef}
                    id="tag-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter tag name"
                    required
                    maxLength={50}
                />
            </div>

            <TagColorPicker
                selectedColor={selectedColor}
                onChange={setSelectedColor}
            />
        </>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="sm:max-w-106.25 sm:rounded-2xl border-border gap-0 overflow-hidden p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">{title}</DialogTitle>
                    <DialogDescription className="sr-only">Form to create or edit tag</DialogDescription>
                    <DialogHeader className="p-6 pb-4">
                        <h2 className="text-lg font-semibold leading-none">{title}</h2>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="px-6 grid gap-5">
                        {formFields}

                        <DialogFooter className="pt-2 gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !name.trim()}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {isSubmitting ? submittingLabel : (
                                    <>
                                        {submitLabel}
                                        <EnterKbd/>
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="p-0 outline-hidden">
                <DrawerTitle className="sr-only">{title}</DrawerTitle>
                <DrawerDescription className="sr-only">Form to create or edit tag</DrawerDescription>
                <DrawerHeader className="p-6 pb-4 text-center">
                    <h2 className="text-lg font-semibold leading-none">{title}</h2>
                </DrawerHeader>
                <form onSubmit={handleSubmit} className="px-6 pb-6 grid gap-5">
                    {formFields}

                    <DrawerFooter className="p-0 pt-2 flex flex-col gap-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
                        >
                            {isSubmitting ? submittingLabel : submitLabel}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="w-full"
                        >
                            Cancel
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
