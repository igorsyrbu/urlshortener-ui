"use client";

import dynamic from "next/dynamic";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";

const DeleteAccountDialog = dynamic(
    () => import("@/components/settings/DeleteAccountDialog").then((dialogModule) => dialogModule.DeleteAccountDialog),
    {ssr: false},
);

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
    const hasOpenedDeleteDialog = useHasBeenOpened(isDeleteDialogOpen);

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

            {hasOpenedDeleteDialog && (
                <DeleteAccountDialog open={isDeleteDialogOpen} onClose={onCloseDeleteDialog} onConfirm={onConfirmDelete}/>
            )}
        </>
    );
}
