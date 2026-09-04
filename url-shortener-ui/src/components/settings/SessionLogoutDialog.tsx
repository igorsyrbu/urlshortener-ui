"use client";

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
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {DEFAULT_JWT_TTL_DISPLAY} from "@/lib/constants";

export type LogoutTarget =
    | { type: "single"; id: string; isCurrent: boolean }
    | { type: "other" }
    | null;

interface SessionLogoutDialogProps {
    target: LogoutTarget;
    jwtTTL: string | null;
    onClose: () => void;
    onConfirm: () => void;
}

function getDialogTitle(target: LogoutTarget): string {
    if (target?.type === "other") return "Do you want to terminate all other sessions?";
    if (target?.type === "single" && target.isCurrent) return "Do you want to terminate the current session?";
    return "Do you want to terminate this session?";
}

function getDialogDescription(target: LogoutTarget, ttl: string): string {
    if (target?.type === "other") {
        return `Note that terminating all other sessions might take up to ${ttl} to take effect across all systems.`;
    }
    if (target?.type === "single" && target.isCurrent) {
        return "You'll be signed out immediately and will need to sign in again to continue.";
    }
    return `Note that terminating this session might take up to ${ttl} to take effect on that device.`;
}

export function SessionLogoutDialog({target, jwtTTL, onClose, onConfirm}: SessionLogoutDialogProps) {
    const ttl = jwtTTL || DEFAULT_JWT_TTL_DISPLAY;
    const isDesktop = useIsDesktop();
    const open = target !== null;

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>{getDialogTitle(target)}</DialogTitle>
                        <DialogDescription>{getDialogDescription(target, ttl)}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={onConfirm}>Continue</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={(isOpen) => {
            if (!isOpen) onClose();
        }}>
            <DrawerContent className="outline-hidden px-6 gap-6">
                <DrawerHeader className="p-0 pb-6 text-center">
                    <DrawerTitle>{getDialogTitle(target)}</DrawerTitle>
                    <DrawerDescription className="text-sm text-foreground/70 mt-2">
                        {getDialogDescription(target, ttl)}
                    </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter className="p-0 flex flex-col gap-2">
                    <Button onClick={onConfirm} className="w-full">
                        Continue
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
