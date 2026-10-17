"use client";

import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";

interface LogoutConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

const LOGOUT_CONFIRM_TITLE = "Are you sure?";
const LOGOUT_CONFIRM_DESCRIPTION = "You will be signed out immediately and will need to sign in again to continue.";
const LOGOUT_LABEL = "Log out";
const CANCEL_LABEL = "Cancel";

export function LogoutConfirmDialog({open, onOpenChange, onConfirm}: LogoutConfirmDialogProps) {
    const isDesktop = useIsDesktop();

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>{LOGOUT_CONFIRM_TITLE}</DialogTitle>
                        <DialogDescription>{LOGOUT_CONFIRM_DESCRIPTION}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>{CANCEL_LABEL}</Button>
                        <Button variant="destructive" onClick={onConfirm}>{LOGOUT_LABEL}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="outline-hidden px-6 gap-6">
                <DrawerHeader className="p-0 pb-6 text-center">
                    <DrawerTitle>{LOGOUT_CONFIRM_TITLE}</DrawerTitle>
                    <DrawerDescription className="text-sm text-foreground/70 mt-2">{LOGOUT_CONFIRM_DESCRIPTION}</DrawerDescription>
                </DrawerHeader>
                <DrawerFooter className="p-0 flex flex-col gap-2">
                    <Button variant="destructive" onClick={onConfirm} className="w-full">{LOGOUT_LABEL}</Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">{CANCEL_LABEL}</Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
