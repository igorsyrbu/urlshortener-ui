"use client";

import dynamic from "next/dynamic";
import {Card, CardContent} from "@/components/ui/card";
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
            <Card className="border-destructive/40">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-destructive">Delete account</p>
                        <p className="text-xs text-muted-foreground">
                            Permanently delete your account, short links and analytics data. This action is irreversible.
                        </p>
                    </div>
                    <Button variant="outline" className="w-full shrink-0 text-destructive hover:text-destructive sm:w-auto"
                            onClick={onOpenDeleteDialog}>
                        Delete Account
                    </Button>
                </CardContent>
            </Card>

            {hasOpenedDeleteDialog && (
                <DeleteAccountDialog open={isDeleteDialogOpen} onClose={onCloseDeleteDialog} onConfirm={onConfirmDelete}/>
            )}
        </>
    );
}
