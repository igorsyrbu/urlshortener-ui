"use client";

import {SidebarPanel} from "@/components/layout/sidebar-panel";

export function Sidebar() {
    return (
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border/50 bg-sidebar lg:flex">
            <SidebarPanel/>
        </aside>
    );
}
