"use client";

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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SidebarUserMenuProps {
    onNavigate?: () => void;
}

export function SidebarUserMenu({onNavigate}: SidebarUserMenuProps) {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async () => {
        try {
            await fetchWithAuth("/users/sessions/current", {
                method: "DELETE",
            });
        } catch (error) {
            console.error("Failed to terminate session on backend", error);
        } finally {
            logout();
            router.replace("/login");
        }
    };

    const handleSettingsClick = () => {
        router.push("/settings");
        onNavigate?.();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent/50">
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
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onSelect={(e) => e.preventDefault()}
                        >
                            <LogOut className="mr-2 size-4"/>
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
