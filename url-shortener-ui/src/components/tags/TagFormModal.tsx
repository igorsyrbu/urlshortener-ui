"use client";

import React, {useEffect, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";
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

    useEffect(() => {
        if (open) {
            setName(initialName);
            setSelectedColor(initialColor);
            setIsSubmitting(false);
        }
    }, [open, initialName, initialColor]);

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

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className="sm:max-w-106.25 sm:rounded-2xl backdrop-blur-md bg-background/95 border-border gap-0 overflow-hidden p-0"
            >
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="px-6 pb-6 grid gap-5">
                    <div className="grid gap-2">
                        <label htmlFor="tag-name" className="text-sm font-medium">
                            Name
                        </label>
                        <Input
                            id="tag-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter tag name"
                            required
                            autoFocus
                            maxLength={50}
                        />
                    </div>

                    <TagColorPicker
                        selectedColor={selectedColor}
                        onChange={setSelectedColor}
                    />

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
                                    <EnterKbd />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
