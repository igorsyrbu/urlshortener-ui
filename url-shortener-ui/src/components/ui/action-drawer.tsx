"use client";

import React from "react";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {cn} from "@/lib/utils";

export interface ActionItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: "default" | "destructive";
    hasSeparator?: boolean;
}

interface ActionDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    actions: ActionItem[];
    align?: "left" | "center";
    overlayClassName?: string;
}

export function ActionDrawer({
                                 open,
                                 onOpenChange,
                                 title = "Actions",
                                 actions,
                                 align = "left",
                                 overlayClassName,
                             }: ActionDrawerProps) {
    const isCentered = align === "center";

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="p-0 outline-hidden" mobileMenuSpacing overlayClassName={overlayClassName ?? "backdrop-blur-md"}>
                <DrawerTitle className="sr-only">{title}</DrawerTitle>
                <DrawerDescription className="sr-only">List of actions available</DrawerDescription>
                <div className="flex flex-col mt-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        const isDestructive = action.variant === "destructive";
                        return (
                            <React.Fragment key={index}>
                                {action.hasSeparator && (
                                    <div className="hairline-divider my-1"/>
                                )}
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        action.onClick();
                                        onOpenChange(false);
                                    }}
                                    className={cn(
                                        "flex w-full text-sm font-medium transition-colors outline-hidden select-none",
                                        "hover:bg-muted/10 active:bg-muted/20",
                                        isDestructive
                                            ? "text-destructive hover:bg-destructive/5 active:bg-destructive/10"
                                            : "text-foreground",
                                        isCentered ? "py-2.5" : "items-center gap-3.5 px-6 py-2.5"
                                    )}
                                >
                                    {isCentered ? (
                                        <span className="flex items-center gap-3.5 mx-auto -translate-x-1">
                                            <Icon
                                                className={cn("size-5 shrink-0", isDestructive ? "text-destructive" : "text-muted-foreground")}/>
                                            <span>{action.label}</span>
                                        </span>
                                    ) : (
                                        <>
                                            <Icon
                                                className={cn("size-5 shrink-0", isDestructive ? "text-destructive" : "text-muted-foreground")}/>
                                            <span>{action.label}</span>
                                        </>
                                    )}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
