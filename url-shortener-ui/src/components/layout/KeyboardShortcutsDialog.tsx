"use client";

import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Kbd} from "@/components/ui/kbd";
import {SHORTCUTS} from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SHORTCUT_LIST = Object.values(SHORTCUTS);

export function KeyboardShortcutsDialog({open, onOpenChange}: KeyboardShortcutsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Keyboard shortcuts</DialogTitle>
                    <DialogDescription>
                        Single keys, outside text fields. You can turn them off in Settings, under Preferences.
                    </DialogDescription>
                </DialogHeader>
                <dl className="flex min-w-0 flex-col divide-y-[0.5px] divide-border">
                    {SHORTCUT_LIST.map((shortcut) => (
                        <div key={`${shortcut.key}-${shortcut.action}`} className="flex min-w-0 items-center gap-3 py-2.5">
                            <dt className="shrink-0">
                                <Kbd className="h-6 min-w-6 text-xs">{shortcut.key.toUpperCase()}</Kbd>
                            </dt>
                            <dd className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{shortcut.action}</p>
                                <p className="text-xs text-muted-foreground">{shortcut.where}</p>
                            </dd>
                        </div>
                    ))}
                </dl>
            </DialogContent>
        </Dialog>
    );
}
