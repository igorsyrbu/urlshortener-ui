"use client";

import {Dialog as DialogPrimitive} from "radix-ui";
import {useEffect} from "react";
import {Dialog, DialogDescription, DialogOverlay, DialogPortal} from "@/components/ui/dialog";
import {cn} from "@/lib/utils";
import {SidebarPanel} from "@/components/layout/sidebar-panel";
import {LARGE_SCREEN_MIN_WIDTH_PX} from "@/lib/constants";

// Drawers and dialogs opened from this drawer render in their own portals, outside it: a press inside them must not close it.
const STACKED_OVERLAY_SELECTOR = [
    '[data-slot="drawer-content"]',
    '[data-slot="drawer-overlay"]',
    '[data-slot="alert-dialog-content"]',
    '[data-slot="alert-dialog-overlay"]',
].join(", ");

function isInsideStackedOverlay(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(STACKED_OVERLAY_SELECTOR) !== null;
}

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
                        if (isInsideStackedOverlay(e.target)) e.preventDefault();
                    }}
                    onInteractOutside={(e) => {
                        if (isInsideStackedOverlay(e.target)) e.preventDefault();
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
