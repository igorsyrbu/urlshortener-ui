"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {ChartBar, LayoutDashboard, Link as LinkIcon, Link as LogoIcon, Settings, Tag, type LucideIcon} from "lucide-react";
import {FOCUS_RING_CLASS, ROUTES} from "@/lib/constants";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";
import {LinkPendingIndicator} from "@/components/ui/link-pending-indicator";
import {isPathWithin} from "@/lib/route-match";

interface NavigationItem {
    name: string;
    href: string;
    /** Route prefix that keeps the item highlighted; defaults to `href`. */
    matchPrefix?: string;
    icon: LucideIcon;
}

const navigation: NavigationItem[] = [
    {name: "Dashboard", href: "/dashboard", icon: LayoutDashboard},
    {name: "Links", href: "/links", icon: LinkIcon},
    {name: "Analytics", href: "/analytics", icon: ChartBar},
    {name: "Tags", href: "/tags", icon: Tag},
    {name: "Settings", href: SETTINGS_ROUTES.DEFAULT, matchPrefix: ROUTES.SETTINGS, icon: Settings},
];

function isNavigationItemActive(item: NavigationItem, pathname: string): boolean {
    return isPathWithin(pathname, item.matchPrefix ?? item.href);
}

interface SidebarNavProps {
    onNavigate?: () => void;
}

export function SidebarNav({onNavigate}: SidebarNavProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3 px-1">
                <div
                    className="bg-sidebar-primary flex aspect-square size-9 items-center justify-center rounded-full text-sidebar-primary-foreground">
                    <LogoIcon className="size-5"/>
                </div>
                <h1 className="text-lg font-extrabold tracking-tight text-sidebar-foreground">Short Links</h1>
            </div>
            <nav className="flex flex-col gap-2.5">
                {navigation.map((item) => {
                    const isActive = isNavigationItemActive(item, pathname);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => onNavigate?.()}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-4 py-1.5 transition-all outline-none",
                                FOCUS_RING_CLASS,
                                isActive
                                    ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            )}
                        >
                            <Icon className="size-5"/>
                            <span className={cn("text-sm", isActive ? "font-bold" : "font-medium")}>{item.name}</span>
                            <LinkPendingIndicator className="ml-auto"/>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
