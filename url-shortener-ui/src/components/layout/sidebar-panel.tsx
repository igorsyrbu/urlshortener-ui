"use client";

import {SidebarNav} from "@/components/layout/sidebar-nav";
import {SidebarUserMenu} from "@/components/layout/sidebar-user-menu";

interface SidebarPanelProps {
    onNavigate?: () => void;
}

export function SidebarPanel({onNavigate}: SidebarPanelProps) {
    return (
        <div className="flex h-full flex-col justify-between p-6">
            <SidebarNav onNavigate={onNavigate}/>
            <div className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
                <SidebarUserMenu onNavigate={onNavigate}/>
            </div>
        </div>
    );
}
