"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";
import { CreateLinkModal } from "@/components/links/CreateLinkModal";
import { CreateTagModal } from "@/components/tags/CreateTagModal";
import { SessionCheckScreen } from "@/components/layout/SessionCheckScreen";
import React, { useState, useRef } from "react";
import { useUIStore } from "@/lib/store/ui";
import { usePathname } from "next/navigation";
import { useSessionBootstrap } from "@/lib/hooks/useSessionBootstrap";
import {
    DASHBOARD_CONTENT_SHELL_CLASS,
    SCROLL_TOP_THRESHOLD,
    SCROLL_DELTA_THRESHOLD,
    FOCUS_RING_CLASS,
    MAIN_CONTENT_ID,
    SKIP_TO_CONTENT_LABEL,
} from "@/lib/constants";
import {cn} from "@/lib/utils";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const {phase, handleRetry} = useSessionBootstrap();
    const pathname = usePathname();
    const { isCreateModalOpen, setCreateModalOpen, isCreateTagModalOpen, setCreateTagModalOpen } = useUIStore();
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const lastScrollY = useRef(0);

    const isTagsPage = pathname === "/tags" || pathname.startsWith("/tags/");
    const createLabel = isTagsPage ? "Create tag" : "Create link";
    const handleCreateClick = () => {
        if (isTagsPage) {
            setCreateTagModalOpen(true);
        } else {
            setCreateModalOpen(true);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const target = e.target as HTMLElement;
        const currentScrollY = target.scrollTop;

        // At the top
        if (currentScrollY < SCROLL_TOP_THRESHOLD) {
            setIsHeaderHidden(false);
            setIsScrolled(false);
        }
        // Middle scrolling
        else {
            if (!isScrolled) setIsScrolled(true);
            if (currentScrollY > lastScrollY.current + SCROLL_DELTA_THRESHOLD) {
                // Scrolling down
                setIsHeaderHidden(true);
            } else if (currentScrollY < lastScrollY.current - SCROLL_DELTA_THRESHOLD) {
                // Scrolling up
                setIsHeaderHidden(false);
            }
        }
        lastScrollY.current = currentScrollY;
    };

    if (phase !== "ready") {
        return <SessionCheckScreen isUnavailable={phase === "unavailable"} onRetry={handleRetry}/>;
    }

    return (
        <div className="bg-sidebar h-dvh w-full overflow-hidden text-foreground transition-colors duration-300">
            <a
                href={`#${MAIN_CONTENT_ID}`}
                className={cn("sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 rounded-lg bg-background text-sm font-medium text-foreground shadow-md outline-none", FOCUS_RING_CLASS)}
            >
                {SKIP_TO_CONTENT_LABEL}
            </a>
            <div className="flex h-full w-full">
                <Sidebar />
                <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden relative">
                    <div
                        className={`z-20 absolute md:static top-0 left-0 right-0 shrink-0 border-b bg-sidebar overflow-y-auto [scrollbar-gutter:stable] transition-all duration-300 ease-in-out ${isScrolled ? "border-border/50 shadow-sm" : "border-transparent"} ${isHeaderHidden ? "-translate-y-full opacity-0 pointer-events-none md:translate-y-0 md:pointer-events-auto md:opacity-100" : "translate-y-0 opacity-100"}`}
                    >
                        <div className={DASHBOARD_CONTENT_SHELL_CLASS}>
                            <Header
                                onCreateClick={handleCreateClick}
                                onMenuClick={() => setIsMobileSidebarOpen(true)}
                                createLabel={createLabel}
                            />
                        </div>
                    </div>
                    <main
                        id={MAIN_CONTENT_ID}
                        tabIndex={-1}
                        className="relative min-h-0 flex-1 overflow-y-auto bg-sidebar pt-16 md:pt-0 [scrollbar-gutter:stable] outline-none"
                        onScroll={handleScroll}
                    >
                        <div
                            className={`${DASHBOARD_CONTENT_SHELL_CLASS} pb-4 pt-2 md:pb-8 md:pt-6 lg:pb-10 lg:pt-6`}
                        >
                            {children}
                        </div>
                    </main>
                </div>
            </div>
            <CreateLinkModal open={isCreateModalOpen} onOpenChange={setCreateModalOpen} />
            <CreateTagModal open={isCreateTagModalOpen} onOpenChange={setCreateTagModalOpen} />
            <MobileSidebarDrawer open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen} />
        </div>
    );
}
