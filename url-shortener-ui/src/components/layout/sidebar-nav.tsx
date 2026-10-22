"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {Link as LogoIcon} from "lucide-react";
import {FOCUS_RING_CLASS} from "@/lib/constants";
import {LinkPendingIndicator} from "@/components/ui/link-pending-indicator";
import {findActiveNavItem, NAV_ITEMS} from "@/components/layout/navigation-items";

interface SidebarNavProps {
    onNavigate?: () => void;
}

export function SidebarNav({onNavigate}: SidebarNavProps) {
    const pathname = usePathname();
    const activeItem = findActiveNavItem(pathname);

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
                {NAV_ITEMS.map((item) => {
                    const isActive = item === activeItem;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
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
                            <span className={cn("text-sm", isActive ? "font-bold" : "font-medium")}>{item.title}</span>
                            <LinkPendingIndicator className="ml-auto"/>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
