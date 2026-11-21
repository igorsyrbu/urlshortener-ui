"use client";

import {Archive, ArchiveRestore, Pause, Play, Trash2, X, type LucideIcon} from "lucide-react";
import {FloatingBottomBar} from "@/components/layout/FloatingBottomBar";
import {Button} from "@/components/ui/button";
import {Kbd} from "@/components/ui/kbd";
import {getArchiveBulkAction, getSuspendBulkAction} from "@/lib/bulk-link-actions";
import {BULK_LINK_ACTION_COPY, LINK_SELECTION_COPY, type BulkLinkAction} from "@/lib/constants";
import {SHORTCUTS} from "@/lib/keyboard-shortcuts";
import type {LinkItem} from "@/lib/types";

interface LinksSelectionBarProps {
    selectedLinks: readonly LinkItem[];
    onClear: () => void;
    onAction: (action: BulkLinkAction) => void;
}

interface BarAction {
    action: BulkLinkAction;
    icon: LucideIcon;
    shortcutKey: string;
}

const ACTION_ICONS = {
    archive: Archive,
    unarchive: ArchiveRestore,
    suspend: Pause,
    resume: Play,
    delete: Trash2,
} as const satisfies Record<BulkLinkAction, LucideIcon>;

function getBarActions(selectedLinks: readonly LinkItem[]): BarAction[] {
    const archiveAction = getArchiveBulkAction(selectedLinks);
    const suspendAction = getSuspendBulkAction(selectedLinks);
    return [
        {action: archiveAction, icon: ACTION_ICONS[archiveAction], shortcutKey: SHORTCUTS.ARCHIVE.key},
        {action: suspendAction, icon: ACTION_ICONS[suspendAction], shortcutKey: SHORTCUTS.SUSPEND.key},
        {action: "delete", icon: ACTION_ICONS.delete, shortcutKey: SHORTCUTS.DELETE.key},
    ];
}

/** Takes the place of the pagination bar while selecting; its actions show once a link is picked. */
export function LinksSelectionBar({selectedLinks, onClear, onAction}: LinksSelectionBarProps) {
    const selectedLabel = LINK_SELECTION_COPY.SELECTED(selectedLinks.length);

    return (
        <FloatingBottomBar ariaLabel={LINK_SELECTION_COPY.BAR_LABEL}>
            <Button variant="ghost" size="icon" onClick={onClear} aria-label={LINK_SELECTION_COPY.CLEAR}
                    className="size-8 shrink-0">
                <X className="size-4"/>
            </Button>
            <span aria-live="polite" title={selectedLabel}
                  className="min-w-0 flex-1 truncate px-1 text-sm font-medium tabular-nums text-foreground sm:flex-none">
                {selectedLabel}
            </span>
            {selectedLinks.length > 0 && (
                <div className="flex shrink-0 items-center">
                    <span aria-hidden="true" className="mr-4 h-4 w-px shrink-0 bg-border sm:mr-1"/>
                    <div className="flex shrink-0 items-center gap-5 sm:gap-1">
                        {getBarActions(selectedLinks).map(({action, icon: Icon, shortcutKey}) => (
                            <Button key={action} variant="ghost" size="sm" onClick={() => onAction(action)}
                                    aria-keyshortcuts={shortcutKey.toUpperCase()} className="shrink-0 whitespace-nowrap">
                                <Icon className="size-4"/>
                                <span className="sr-only sm:not-sr-only">{BULK_LINK_ACTION_COPY[action].VERB}</span>
                                <Kbd className="hidden sm:inline-flex">{shortcutKey.toUpperCase()}</Kbd>
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </FloatingBottomBar>
    );
}
