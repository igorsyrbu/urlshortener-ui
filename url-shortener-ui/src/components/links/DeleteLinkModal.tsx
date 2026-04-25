"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";

interface DeleteLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading: boolean;
    linkTitle?: string;
}

export function DeleteLinkModal({
                                    open,
                                    onOpenChange,
                                    onConfirm,
                                    loading,
                                    linkTitle
                                }: DeleteLinkModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-106.25 sm:rounded-2xl backdrop-blur-md bg-background/95 border-border">
                <DialogHeader>
                    <DialogTitle>Delete Link</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <span
                        className="font-bold text-foreground">"{linkTitle}"</span>? This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
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
                        disabled={loading}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {loading ? "Deleting..." : "Delete Link"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
