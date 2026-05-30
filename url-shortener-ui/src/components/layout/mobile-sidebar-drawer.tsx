"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {useEffect} from "react";
import {Dialog, DialogDescription, DialogOverlay, DialogPortal} from "@/components/ui/dialog";
import {cn} from "@/lib/utils";
import {SidebarPanel} from "@/components/layout/sidebar-panel";
import {LARGE_SCREEN_MIN_WIDTH_PX} from "@/lib/constants";

interface MobileSidebarDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MobileSidebarDrawer({open, onOpenChange}: MobileSidebarDrawerProps) {
    useEffect(() => {
        const mediaQuery = window.matchMedia(`(min-width: ${LARGE_SCREEN_MIN_WIDTH_PX}px)`);

        const handleBreakpointChange = () => {
            if (mediaQuery.matches) {
                onOpenChange(false);
            }
        };

        mediaQuery.addEventListener("change", handleBreakpointChange);
        handleBreakpointChange();

        return () => mediaQuery.removeEventListener("change", handleBreakpointChange);
    }, [onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay
                    className={cn(
                        "lg:hidden",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                    )}
                />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar outline-none lg:hidden",
                        "border-r border-border/50 shadow-lg",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300",
                        "focus:outline-none",
                    )}
                    onPointerDownOutside={(e) => {
                        const target = e.target as HTMLElement | null;
                        if (
                            target?.closest('[data-slot="drawer-content"]') ||
                            target?.closest('[data-slot="drawer-overlay"]') ||
                            target?.closest('[data-slot="alert-dialog-content"]') ||
                            target?.closest('[data-slot="alert-dialog-overlay"]')
                        ) {
                            e.preventDefault();
                        }
                    }}
                    onInteractOutside={(e) => {
                        const target = e.target as HTMLElement | null;
                        if (
                            target?.closest('[data-slot="drawer-content"]') ||
                            target?.closest('[data-slot="drawer-overlay"]') ||
                            target?.closest('[data-slot="alert-dialog-content"]') ||
                            target?.closest('[data-slot="alert-dialog-overlay"]')
                        ) {
                            e.preventDefault();
                        }
                    }}
                >
                    <DialogPrimitive.Title className="sr-only">Main navigation</DialogPrimitive.Title>
                    <DialogDescription className="sr-only">
                        Dashboard, links, analytics, tags, settings, and account actions.
                    </DialogDescription>
                    <SidebarPanel onNavigate={() => onOpenChange(false)}/>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}
