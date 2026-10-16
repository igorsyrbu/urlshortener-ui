"use client";

import {BILLING_COPY} from "@/lib/billing-constants";
import {Button} from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";

interface PeriodSwitchConfirmModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function PeriodSwitchConfirmModal({open, onOpenChange, onConfirm}: PeriodSwitchConfirmModalProps) {
    const isDesktop = useIsDesktop();

    const bodyContent = (
        <div className="flex min-w-0 flex-col gap-3">
            {isDesktop ? (
                <DialogDescription>{BILLING_COPY.SWITCH_CONFIRM_DESCRIPTION}</DialogDescription>
            ) : (
                <DrawerDescription>{BILLING_COPY.SWITCH_CONFIRM_DESCRIPTION}</DrawerDescription>
            )}
            <p className="min-w-0 break-words text-sm text-muted-foreground">{BILLING_COPY.SWITCH_CONFIRM_NOTE}</p>
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-106.25 sm:rounded-2xl border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{BILLING_COPY.SWITCH_CONFIRM_TITLE}</DialogTitle>
                    </DialogHeader>
                    {bodyContent}
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button variant="default" onClick={onConfirm}>
                            {BILLING_COPY.SWITCH_CONFIRM_BUTTON}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="outline-hidden px-6 gap-6">
                <DrawerHeader className="p-0 pt-2 pb-4 text-center">
                    <DrawerTitle>{BILLING_COPY.SWITCH_CONFIRM_TITLE}</DrawerTitle>
                </DrawerHeader>
                {bodyContent}
                <DrawerFooter className="p-0 mt-6 flex flex-col gap-3">
                    <Button variant="default" onClick={onConfirm} className="w-full">
                        {BILLING_COPY.SWITCH_CONFIRM_BUTTON}
                    </Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
                        Cancel
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
