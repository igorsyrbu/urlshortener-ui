"use client";

import {useState, type ReactNode} from "react";
import {AnimatePresence, motion, useReducedMotion, type Transition} from "framer-motion";
import {Archive, Download, LoaderCircle, MoreVertical, TableProperties} from "lucide-react";
import {cn} from "@/lib/utils";
import {Kbd} from "@/components/ui/kbd";
import {SearchBar} from "@/components/layout/SearchBar";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {ImportRadialProgress} from "@/components/links/ImportRadialProgress";
import {useImportTracker, IMPORT_TRACKING_STATUS, type ImportTrackingStatus} from "@/lib/store/import";
import type {LinkImportProgressDTO} from "@/lib/api-types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Switch} from "@/components/ui/switch";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {
    EXPORT_AS_CSV_LABEL,
    IMPORT_FROM_CSV_LABEL,
} from "@/components/links/import-export-constants";

interface PageToolbarProps {
    showOptions?: boolean;
    showArchived?: boolean;
    onShowArchivedChange?: (value: boolean) => void;
    showImportExport?: boolean;
    onImportCsvClick?: () => void;
    onExportCsvClick?: () => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const OPTIONS_BUTTON_CLASS =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none";

function isImportOngoing(status: ImportTrackingStatus): boolean {
    // An interrupted stream never confirms the job is gone, so keep the
    // import action disabled until the backend confirms no ongoing import.
    return status === IMPORT_TRACKING_STATUS.DISCOVERING
        || status === IMPORT_TRACKING_STATUS.ACTIVE
        || status === IMPORT_TRACKING_STATUS.RECONNECTING
        || status === IMPORT_TRACKING_STATUS.INTERRUPTED;
}

function shouldShowImportRadial(status: ImportTrackingStatus, hasProgress: boolean): boolean {
    return hasProgress && (status === IMPORT_TRACKING_STATUS.DISCOVERING
        || status === IMPORT_TRACKING_STATUS.ACTIVE
        || status === IMPORT_TRACKING_STATUS.RECONNECTING);
}

function renderImportIndicator(
    progress: LinkImportProgressDTO | null,
    show: boolean,
    transition: Transition,
    onPress?: () => void,
): ReactNode {
    if (!show || !progress) return null;
    return (
        <motion.span
            key="import-radial"
            initial={{opacity: 0, scale: 0.5, x: 28}}
            animate={{opacity: 1, scale: 1, x: 0}}
            exit={{opacity: 0, scale: 0.5, x: 36}}
            transition={transition}
            className="relative z-0 flex shrink-0 items-center"
        >
            <ImportRadialProgress
                processedRows={progress.processedRows}
                totalRows={progress.totalRows}
                onPress={onPress}
            />
        </motion.span>
    );
}

interface DesktopOptionsMenuProps {
    showArchived: boolean;
    onShowArchivedChange?: (value: boolean) => void;
    showImportExport: boolean;
    isImportDisabled: boolean;
    onImportCsvClick?: () => void;
    onExportCsvClick?: () => void;
}

function renderDesktopOptionsMenu(props: DesktopOptionsMenuProps): ReactNode {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className={OPTIONS_BUTTON_CLASS}>
                    <MoreVertical className="size-5"/>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sm:min-w-48">
                <DropdownMenuItem
                    className="group focus:bg-transparent data-highlighted:bg-transparent"
                    onSelect={(e) => {
                        e.preventDefault();
                        props.onShowArchivedChange?.(!props.showArchived);
                    }}
                >
                    <div className="w-7 flex items-center justify-center shrink-0">
                        <Archive className="size-4 group-hover:hidden"/>
                        <Kbd
                            className="hidden group-hover:inline-flex border-border bg-transparent px-1">A</Kbd>
                    </div>
                    <span className="flex-1">Show archived links</span>
                    <Switch size="sm" readOnly checked={props.showArchived} className="ml-3"/>
                </DropdownMenuItem>
                {props.showImportExport && (
                    <>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem disabled={props.isImportDisabled} onSelect={() => props.onImportCsvClick?.()}>
                            <div className="w-7 flex items-center justify-center shrink-0">
                                <TableProperties className="size-4"/>
                            </div>
                            <span className="flex-1">{IMPORT_FROM_CSV_LABEL}</span>
                            {props.isImportDisabled && (
                                <LoaderCircle
                                    className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
                                    aria-hidden="true"/>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => props.onExportCsvClick?.()}>
                            <div className="w-7 flex items-center justify-center shrink-0">
                                <Download className="size-4"/>
                            </div>
                            <span className="flex-1">{EXPORT_AS_CSV_LABEL}</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface MobileOptionsMenuProps extends DesktopOptionsMenuProps {
    isDrawerOpen: boolean;
    onDrawerOpenChange: (open: boolean) => void;
    onMobileImportClick: () => void;
    onMobileExportClick: () => void;
}

function renderMobileOptionsMenu(props: MobileOptionsMenuProps): ReactNode {
    return (
        <>
            <button
                onClick={() => props.onDrawerOpenChange(true)}
                className={OPTIONS_BUTTON_CLASS}
            >
                <MoreVertical className="size-5"/>
            </button>
            <Drawer open={props.isDrawerOpen} onOpenChange={props.onDrawerOpenChange}>
                <DrawerContent className="p-0 outline-hidden">
                    <DrawerTitle className="sr-only">Options</DrawerTitle>
                    <DrawerDescription className="sr-only">Page options</DrawerDescription>
                    <div className="flex flex-col mt-3">
                        <button
                            onClick={() => props.onShowArchivedChange?.(!props.showArchived)}
                            className="flex w-full items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                        >
                            <Archive className="size-5 shrink-0"/>
                            <span className="flex-1 text-left">Show archived links</span>
                            <Switch readOnly checked={props.showArchived}/>
                        </button>
                        {props.showImportExport && (
                            <>
                                <div className="hairline-divider my-1"/>
                                <button
                                    onClick={props.onMobileImportClick}
                                    disabled={props.isImportDisabled}
                                    className="flex w-full items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <TableProperties className="size-5 shrink-0"/>
                                    <span
                                        className="flex-1 text-left">{IMPORT_FROM_CSV_LABEL}</span>
                                    {props.isImportDisabled && (
                                        <LoaderCircle
                                            className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
                                            aria-hidden="true"/>
                                    )}
                                </button>
                                <button
                                    onClick={props.onMobileExportClick}
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
        </>
    );
}

export function PageToolbar({
                                showOptions = false,
                                showArchived = false,
                                onShowArchivedChange,
                                showImportExport = false,
                                onImportCsvClick,
                                onExportCsvClick,
                                searchValue,
                                onSearchChange,
                                placeholder,
                                className
                            }: PageToolbarProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const isDesktop = useIsDesktop();
    const shouldReduceMotion = useReducedMotion() ?? false;
    const importStatus = useImportTracker((state) => state.status);
    const importProgress = useImportTracker((state) => state.progress);
    const isImportDisabled = showImportExport && isImportOngoing(importStatus);
    const showImportRadial = showImportExport && shouldShowImportRadial(importStatus, importProgress !== null);
    const playfulTransition: Transition = shouldReduceMotion
        ? {duration: 0}
        : {type: "spring", stiffness: 550, damping: 26};

    const handleMobileImportClick = (): void => {
        if (isImportDisabled) return;
        setIsDrawerOpen(false);
        onImportCsvClick?.();
    };

    const handleMobileExportClick = (): void => {
        setIsDrawerOpen(false);
        onExportCsvClick?.();
    };

    const menuProps: DesktopOptionsMenuProps = {
        showArchived,
        onShowArchivedChange,
        showImportExport,
        isImportDisabled,
        onImportCsvClick,
        onExportCsvClick,
    };

    return (
        <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
            <motion.div layout transition={playfulTransition} className="min-w-0 flex-1 max-w-md">
                <SearchBar
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder={placeholder}
                />
            </motion.div>

            {(showImportRadial || showOptions) && (
                <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {renderImportIndicator(importProgress, showImportRadial, playfulTransition, onImportCsvClick)}
                    </AnimatePresence>
                    {showOptions && (
                        <div className="relative z-10 flex shrink-0 items-center">
                            {isDesktop
                                ? renderDesktopOptionsMenu(menuProps)
                                : renderMobileOptionsMenu({
                                    ...menuProps,
                                    isDrawerOpen,
                                    onDrawerOpenChange: setIsDrawerOpen,
                                    onMobileImportClick: handleMobileImportClick,
                                    onMobileExportClick: handleMobileExportClick,
                                })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
