import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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

            <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                if (!open) onCloseDeleteDialog();
            }}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete your account? This action cannot be undone. All your
                            short links, analytics data, and account information will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={onCloseDeleteDialog}>Cancel</Button>
                        <Button variant="destructive" onClick={onConfirmDelete}>Yes, Delete Account</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
