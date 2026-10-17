"use client";

import {useState, type ComponentProps} from "react";
import {useRouter} from "next/navigation";
import {LogOut, Settings, User} from "lucide-react";
import dynamic from "next/dynamic";
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
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {cn} from "@/lib/utils";
import {API_ENDPOINTS, FOCUS_RING_CLASS, ICON_BUTTON_LABELS, ROUTES} from "@/lib/constants";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";
import {attempt} from "@/lib/async-utils";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";

const AccountMenuDrawer = dynamic(
    () => import("@/components/layout/AccountMenuDrawer").then((drawerModule) => drawerModule.AccountMenuDrawer),
    {ssr: false},
);
const LogoutConfirmDialog = dynamic(
    () => import("@/components/layout/LogoutConfirmDialog").then((dialogModule) => dialogModule.LogoutConfirmDialog),
    {ssr: false},
);

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
    const hasOpenedDrawer = useHasBeenOpened(isDrawerOpen);
    const hasOpenedConfirm = useHasBeenOpened(isConfirmOpen);

    const handleLogout = async () => {
        const result = await attempt(() => fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_CURRENT, {method: "DELETE"}));
        if (!result.isSuccess) logger.error("Failed to terminate session on backend", result.error);
        logout();
        router.replace(ROUTES.LOGIN);
    };

    const handleSettingsClick = () => {
        router.push(SETTINGS_ROUTES.DEFAULT);
        onNavigate?.();
    };

    const renderTrigger = (props: ComponentProps<"button">) => (
        <button
            type="button"
            aria-label={ICON_BUTTON_LABELS.ACCOUNT_MENU}
            {...props}
            className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/50 outline-none", FOCUS_RING_CLASS)}>
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
                {user ? (
                    <p className="truncate text-sidebar-foreground">{user.name || user.email}</p>
                ) : (
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" aria-hidden="true"/>
                )}
            </div>
        </button>
    );

    return (
        <>
            {isDesktop ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {renderTrigger({})}
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
                <>
                    {renderTrigger({onClick: () => setIsDrawerOpen(true), "aria-haspopup": "dialog", "aria-expanded": isDrawerOpen})}
                    {hasOpenedDrawer && (
                        <AccountMenuDrawer
                            open={isDrawerOpen}
                            onOpenChange={setIsDrawerOpen}
                            user={user}
                            onSettingsClick={handleSettingsClick}
                            onLogoutClick={() => setIsConfirmOpen(true)}
                        />
                    )}
                </>
            )}

            {hasOpenedConfirm && (
                <LogoutConfirmDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen} onConfirm={() => void handleLogout()}/>
            )}
        </>
    );
}
