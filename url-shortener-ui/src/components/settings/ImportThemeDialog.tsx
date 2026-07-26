"use client";

import {XIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {Input} from "@/components/ui/input";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";

interface ImportThemeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onValueChange: (value: string) => void;
    onImport: () => void;
    hasError: boolean;
}

export function ImportThemeDialog({open, onOpenChange, value, onValueChange, onImport, hasError}: ImportThemeDialogProps) {
    const isDesktop = useIsDesktop();

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            onImport();
        }
    };

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import theme</DialogTitle>
                        <DialogDescription>
                            Paste four comma-separated hex colors: background, cards, accent, danger.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={value}
                        onChange={(event) => onValueChange(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="#f5f4ef,#ffffff,#d96a47,#cc2525"
                        aria-invalid={hasError}
                        spellCheck={false}
                    />
                    {hasError && (
                        <p className="text-sm text-destructive">
                            Invalid theme. Expected four comma-separated hex colors.
                        </p>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={onImport}>Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="outline-hidden px-6 pb-6 gap-6">
                <DrawerClose className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                    <XIcon className="size-4"/>
                    <span className="sr-only">Close</span>
                </DrawerClose>
                <DrawerHeader className="p-0 pb-6 text-center">
                    <DrawerTitle>Import theme</DrawerTitle>
                    <DrawerDescription className="text-sm text-foreground/70 mt-2">
                        Paste four comma-separated hex colors: background, cards, accent, danger.
                    </DrawerDescription>
                </DrawerHeader>
                <div className="flex flex-col gap-2 w-full pb-6">
                    <Input
                        value={value}
                        onChange={(event) => onValueChange(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="#f5f4ef,#ffffff,#d96a47,#cc2525"
                        aria-invalid={hasError}
                        spellCheck={false}
                        className="h-11"
                    />
                    {hasError && (
                        <p className="text-sm text-destructive">
                            Invalid theme. Expected four comma-separated hex colors.
                        </p>
                    )}
                </div>
                <DrawerFooter className="p-0 flex flex-col gap-2">
                    <Button onClick={onImport} className="w-full">
                        Import
                    </Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
                        Cancel
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
