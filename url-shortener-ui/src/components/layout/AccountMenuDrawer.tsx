"use client";

import {LogOut, Settings} from "lucide-react";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import type {UserProfile} from "@/lib/store/auth";

interface AccountMenuDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserProfile | null;
    onSettingsClick: () => void;
    onLogoutClick: () => void;
}

export function AccountMenuDrawer({open, onOpenChange, user, onSettingsClick, onLogoutClick}: AccountMenuDrawerProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="p-0 outline-hidden" mobileMenuSpacing>
                <DrawerTitle className="sr-only">Account options</DrawerTitle>
                <DrawerDescription className="sr-only">Settings and log out</DrawerDescription>

                <div className="flex flex-col px-6 py-3 mt-3">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>

                <div className="hairline-divider my-1"/>

                <div className="flex flex-col">
                    <button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onSettingsClick();
                        }}
                        className="flex w-full items-center gap-3.5 px-6 py-2.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                    >
                        <Settings className="size-5 shrink-0 text-muted-foreground"/>
                        <span>Settings</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onOpenChange(false);
                            onLogoutClick();
                        }}
                        className="flex w-full items-center gap-3.5 px-6 py-2.5 text-sm font-medium transition-colors outline-hidden select-none text-destructive hover:bg-destructive/5 active:bg-destructive/10"
                    >
                        <LogOut className="size-5 shrink-0 text-destructive"/>
                        <span>Log out</span>
                    </button>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
