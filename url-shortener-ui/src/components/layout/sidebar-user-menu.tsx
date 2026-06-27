"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {LogOut, Settings, User} from "lucide-react";
import {useAuthStore} from "@/lib/store/auth";
import {fetchWithAuth} from "@/lib/api";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {logger} from "@/lib/logger";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger,} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";

interface SidebarUserMenuProps {
    onNavigate?: () => void;
}

export function SidebarUserMenu({onNavigate}: SidebarUserMenuProps) {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const isDesktop = useIsDesktop();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await fetchWithAuth("/users/sessions/current", {
                method: "DELETE",
            });
        } catch (error) {
            logger.error("Failed to terminate session on backend", error);
        } finally {
            logout();
            router.replace("/login");
        }
    };

    const handleSettingsClick = () => {
        router.push("/settings");
        onNavigate?.();
    };

    const triggerElement = (
        <div
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent/50 focus:outline-none">
            <Avatar className="size-8 shrink-0 border border-sidebar-border bg-sidebar-accent">
                <AvatarImage
                    src={user?.pictureUrl || undefined}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="object-cover"
                />
                <AvatarFallback className="bg-transparent text-sidebar-foreground">
                    <User className="size-4"/>
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center overflow-hidden text-sm">
                <p className="truncate text-sidebar-foreground">{user?.name || user?.email}</p>
            </div>
        </div>
    );

    return (
        <>
            {isDesktop ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {triggerElement}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="truncate pb-1 text-sm font-medium leading-none">{user?.name}</p>
                                <p className="truncate pb-1 text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        <DropdownMenuItem className="cursor-pointer" onClick={handleSettingsClick}>
                            <Settings className="mr-2 size-4"/>
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setIsConfirmOpen(true)}
                        >
                            <LogOut className="mr-2 size-4"/>
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <DrawerTrigger asChild>
                        {triggerElement}
                    </DrawerTrigger>
                    <DrawerContent className="p-0 outline-hidden">
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
                                    setIsDrawerOpen(false);
                                    handleSettingsClick();
                                }}
                                className="flex w-full items-center gap-3.5 px-6 py-2.5 text-sm font-medium transition-colors outline-hidden select-none hover:bg-muted/10 active:bg-muted/20 text-foreground"
                            >
                                <Settings className="size-5 shrink-0 text-muted-foreground"/>
                                <span>Settings</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsDrawerOpen(false);
                                    setIsConfirmOpen(true);
                                }}
                                className="flex w-full items-center gap-3.5 px-6 py-2.5 text-sm font-medium transition-colors outline-hidden select-none text-destructive hover:bg-destructive/5 active:bg-destructive/10"
                            >
                                <LogOut className="size-5 shrink-0 text-destructive"/>
                                <span>Log out</span>
                            </button>
                        </div>
                    </DrawerContent>
                </Drawer>
            )}

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be signed out immediately and will need to sign in again to continue.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            variant="destructive"
                        >
                            Log out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
