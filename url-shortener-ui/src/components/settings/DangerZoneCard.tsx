"use client";

import {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
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

interface DangerZoneCardProps {
    isDeleteDialogOpen: boolean;
    onOpenDeleteDialog: () => void;
    onCloseDeleteDialog: () => void;
    onConfirmDelete: () => void;
}

export function DangerZoneCard({
                                   isDeleteDialogOpen,
                                   onOpenDeleteDialog,
                                   onCloseDeleteDialog,
                                   onConfirmDelete,
                               }: DangerZoneCardProps) {
    const isDesktop = useIsDesktop();
    const user = useAuthStore((state) => state.user);
    const userEmail = user?.email || "";

    const [confirmEmail, setConfirmEmail] = useState("");

    useEffect(() => {
        if (!isDeleteDialogOpen) {
            setConfirmEmail("");
        }
    }, [isDeleteDialogOpen]);

    const isEmailConfirmed = confirmEmail.trim().toLowerCase() === userEmail.trim().toLowerCase();

    return (
        <>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Permanently delete your account and all associated data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm mb-4 border-[0.5px] border-destructive/20">
                        <strong>Warning:</strong> This action is irreversible. All your short links, analytics
                        data, and account information will be permanently removed.
                    </div>
                </CardContent>
                <CardFooter className="px-6">
                    <Button variant="destructive" onClick={onOpenDeleteDialog}>
                        Delete Account
                    </Button>
                </CardFooter>
            </Card>

            {isDesktop ? (
                <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                    if (!open) onCloseDeleteDialog();
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
                                className="h-10 text-sm"
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={onCloseDeleteDialog}>Cancel</Button>
                            <Button variant="destructive" onClick={onConfirmDelete} disabled={!isEmailConfirmed}>
                                Yes, Delete Account
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isDeleteDialogOpen} onOpenChange={(open) => {
                    if (!open) onCloseDeleteDialog();
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
                                className="h-10 text-sm w-full"
                            />
                        </div>

                        <DrawerFooter className="p-0 flex flex-col gap-2">
                            <Button variant="destructive" onClick={onConfirmDelete} disabled={!isEmailConfirmed}
                                    className="w-full">
                                Yes, Delete Account
                            </Button>
                            <Button variant="ghost" onClick={onCloseDeleteDialog} className="w-full">
                                Cancel
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            )}
        </>
    );
}
