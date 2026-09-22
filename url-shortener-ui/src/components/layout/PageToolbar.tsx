"use client";

import {useState} from "react";
import {Archive, Download, MoreVertical, TableProperties} from "lucide-react";
import {cn} from "@/lib/utils";
import {Kbd} from "@/components/ui/kbd";
import {SearchBar} from "@/components/layout/SearchBar";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
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
    "ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none";

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

    const handleMobileImportClick = (): void => {
        setIsDrawerOpen(false);
        onImportCsvClick?.();
    };

    const handleMobileExportClick = (): void => {
        setIsDrawerOpen(false);
        onExportCsvClick?.();
    };

    return (
        <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
            <div className="min-w-0 flex-1 max-w-md">
                <SearchBar
                    value={searchValue}
                    onChange={onSearchChange}
                    placeholder={placeholder}
                />
            </div>

            {showOptions && (
                isDesktop ? (
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
                                    onShowArchivedChange?.(!showArchived);
                                }}
                            >
                                <div className="w-7 flex items-center justify-center shrink-0">
                                    <Archive className="size-4 group-hover:hidden"/>
                                    <Kbd
                                        className="hidden group-hover:inline-flex border-border bg-transparent px-1">A</Kbd>
                                </div>
                                <span className="flex-1">Show archived links</span>
                                <Switch size="sm" readOnly checked={showArchived} className="ml-3"/>
                            </DropdownMenuItem>
                            {showImportExport && (
                                <>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onSelect={() => onImportCsvClick?.()}>
                                        <div className="w-7 flex items-center justify-center shrink-0">
                                            <TableProperties className="size-4"/>
                                        </div>
                                        <span className="flex-1">{IMPORT_FROM_CSV_LABEL}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onExportCsvClick?.()}>
                                        <div className="w-7 flex items-center justify-center shrink-0">
                                            <Download className="size-4"/>
                                        </div>
                                        <span className="flex-1">{EXPORT_AS_CSV_LABEL}</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <>
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className={OPTIONS_BUTTON_CLASS}
                        >
                            <MoreVertical className="size-5"/>
                        </button>
                        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                            <DrawerContent className="p-0 outline-hidden">
                                <DrawerTitle className="sr-only">Options</DrawerTitle>
                                <DrawerDescription className="sr-only">Page options</DrawerDescription>
                                <div className="flex flex-col mt-3">
                                    <button
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
                                                onClick={handleMobileImportClick}
                                                className="flex w-full items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                                            >
                                                <TableProperties className="size-5 shrink-0"/>
                                                <span
                                                    className="flex-1 text-left">{IMPORT_FROM_CSV_LABEL}</span>
                                            </button>
                                            <button
                                                onClick={handleMobileExportClick}
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
                )
            )}
        </div>
    );
}
