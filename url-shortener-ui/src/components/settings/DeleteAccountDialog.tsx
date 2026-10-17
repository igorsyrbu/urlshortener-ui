"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useAuthStore} from "@/lib/store/auth";
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

interface DeleteAccountDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteAccountDialog({open, onClose, onConfirm}: DeleteAccountDialogProps) {
    const isDesktop = useIsDesktop();
    const user = useAuthStore((state) => state.user);
    const userEmail = user?.email || "";

    const [confirmEmail, setConfirmEmail] = useState("");

    useEffect(() => {
        if (!open) {
            setConfirmEmail("");
        }
    }, [open]);

    // The profile can still be loading while this dialog renders; an unknown email must never match an empty field.
    const isEmailConfirmed = userEmail !== "" && confirmEmail.trim().toLowerCase() === userEmail.trim().toLowerCase();

    return (
        <>
        {isDesktop ? (
            <Dialog open={open} onOpenChange={(open) => {
                if (!open) onClose();
            }}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete your account?<br/>This action cannot be undone. All your
                            short links, analytics data, and account information will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2 py-2">
                        <label htmlFor="confirm-email-dialog" className="text-sm font-medium text-foreground">
                            Please type in your email to confirm.
                        </label>
                        <Input
                            id="confirm-email-dialog"
                            type="email"
                            placeholder={userEmail}
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                            className="h-10"
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button variant="destructive" onClick={onConfirm} disabled={!isEmailConfirmed}>
                            Yes, Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        ) : (
            <Drawer open={open} onOpenChange={(open) => {
                if (!open) onClose();
            }}>
                <DrawerContent className="outline-hidden px-6 gap-6">
                    <DrawerHeader className="p-0 pb-6 text-center">
                        <DrawerTitle>Delete Account</DrawerTitle>
                        <DrawerDescription className="text-sm text-foreground/70 mt-2">
                            Are you sure you want to delete your account?<br/>This action cannot be undone. All your
                            short links, analytics data, and account information will be permanently removed.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="flex flex-col gap-2 w-full">
                        <label htmlFor="confirm-email-drawer"
                               className="text-sm font-medium text-foreground text-left">
                            Please type in your email to confirm.
                        </label>
                        <Input
                            id="confirm-email-drawer"
                            type="email"
                            placeholder={userEmail}
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                            className="h-10 w-full"
                        />
                    </div>

                    <DrawerFooter className="p-0 flex flex-col gap-2">
                        <Button variant="destructive" onClick={onConfirm} disabled={!isEmailConfirmed}
                                className="w-full">
                            Yes, Delete Account
                        </Button>
                        <Button variant="ghost" onClick={onClose} className="w-full">
                            Cancel
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        )}
        </>
    );
}
