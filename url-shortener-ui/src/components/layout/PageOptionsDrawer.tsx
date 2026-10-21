"use client";

import {Archive, Download, LoaderCircle, TableProperties} from "lucide-react";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {Switch} from "@/components/ui/switch";
import {EXPORT_AS_CSV_LABEL, IMPORT_FROM_CSV_LABEL} from "@/components/links/import-export-constants";

interface PageOptionsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    showArchived: boolean;
    onShowArchivedChange?: (value: boolean) => void;
    showImportExport: boolean;
    isImportDisabled: boolean;
    onImportClick: () => void;
    onExportClick: () => void;
}

export function PageOptionsDrawer({
                                      open,
                                      onOpenChange,
                                      showArchived,
                                      onShowArchivedChange,
                                      showImportExport,
                                      isImportDisabled,
                                      onImportClick,
                                      onExportClick,
                                  }: PageOptionsDrawerProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="p-0 outline-hidden">
                <DrawerTitle className="sr-only">Options</DrawerTitle>
                <DrawerDescription className="sr-only">Page options</DrawerDescription>
                <div className="flex flex-col mt-3">
                    <button
                        role="switch"
                        aria-checked={showArchived}
                        onClick={() => onShowArchivedChange?.(!showArchived)}
                        className="flex w-full items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                    >
                        <Archive className="size-5 shrink-0"/>
                        <span className="flex-1 text-left">Show archived links</span>
                        <Switch readOnly checked={showArchived}/>
                    </button>
                    {showImportExport && (
                        <>
                            <div className="hairline-divider my-1"/>
                            <button
                                onClick={onImportClick}
                                disabled={isImportDisabled}
                                className="flex w-full items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <TableProperties className="size-5 shrink-0"/>
                                <span
                                    className="flex-1 text-left">{IMPORT_FROM_CSV_LABEL}</span>
                                {isImportDisabled && (
                                    <LoaderCircle
                                        className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
                                        aria-hidden="true"/>
                                )}
                            </button>
                            <button
                                onClick={onExportClick}
                                className="flex w-full items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                            >
                                <Download className="size-5 shrink-0"/>
                                <span
                                    className="flex-1 text-left">{EXPORT_AS_CSV_LABEL}</span>
                            </button>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
