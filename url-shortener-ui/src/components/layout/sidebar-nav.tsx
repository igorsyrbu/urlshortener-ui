"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {ChartBar, LayoutDashboard, Link as LinkIcon, Link as LogoIcon, Settings, Tag,} from "lucide-react";

const navigation = [
    {name: "Dashboard", href: "/dashboard", icon: LayoutDashboard},
    {name: "Links", href: "/links", icon: LinkIcon},
    {name: "Analytics", href: "/analytics", icon: ChartBar},
    {name: "Tags", href: "/tags", icon: Tag},
    {name: "Settings", href: "/settings", icon: Settings},
];

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
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => onNavigate?.()}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-4 py-1.5 transition-all focus:outline-none",
                                isActive
                                    ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                            )}
                        >
                            <Icon className="size-5"/>
                            <span className={cn("text-sm", isActive ? "font-bold" : "font-medium")}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
