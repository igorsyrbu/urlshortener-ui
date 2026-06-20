"use client";

import {useState} from "react";
import {Archive, MoreVertical} from "lucide-react";
import {cn} from "@/lib/utils";
import {Kbd} from "@/components/ui/kbd";
import {SearchBar} from "@/components/layout/SearchBar";
import {MOBILE_BREAKPOINT_PX} from "@/lib/constants";
import {useMediaQuery} from "@/lib/hooks/useMediaQuery";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Switch} from "@/components/ui/switch";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";

interface PageToolbarProps {
    showOptions?: boolean;
    showArchived?: boolean;
    onShowArchivedChange?: (value: boolean) => void;
    className?: string;
}

const OPTIONS_BUTTON_CLASS =
    "ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[0.5px] border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none";

export function PageToolbar({
                                showOptions = false,
                                showArchived = false,
                                onShowArchivedChange,
                                className
                            }: PageToolbarProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const isDesktop = useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);

    return (
        <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
            <div className="min-w-0 flex-1 max-w-md">
                <SearchBar/>
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
                                className="group focus:bg-transparent data-[highlighted]:bg-transparent"
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
                                        className="flex w-full items-center gap-3.5 px-6 py-2.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                                    >
                                        <Archive className="size-5 shrink-0 text-muted-foreground"/>
                                        <span className="flex-1 text-left">Show archived links</span>
                                        <Switch readOnly checked={showArchived}/>
                                    </button>
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </>
                )
            )}
        </div>
    );
}
