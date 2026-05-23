"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";
import { CreateLinkModal } from "@/components/links/CreateLinkModal";
import { CreateTagModal } from "@/components/tags/CreateTagModal";
import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useUIStore } from "@/lib/store/ui";
import { useRouter, usePathname } from "next/navigation";
import { fetchWithAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";
import {
    API_ENDPOINTS,
    DASHBOARD_CONTENT_SHELL_CLASS,
    ROUTES,
    SCROLL_TOP_THRESHOLD,
    SCROLL_DELTA_THRESHOLD,
} from "@/lib/constants";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isCreateModalOpen, setCreateModalOpen, isCreateTagModalOpen, setCreateTagModalOpen } = useUIStore();
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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

    useEffect(() => {
        let mounted = true;
        const checkAuth = async () => {
            const authStore = useAuthStore.getState();
            if (!authStore.accessToken || !authStore.user) {
                try {
                    const res = await fetchWithAuth(API_ENDPOINTS.USERS_ME);
                    if (res && res.ok && mounted) {
                        const data = await res.json();
                        authStore.setUser(data);
                        setIsCheckingAuth(false);
                    } else if (mounted) {
                        router.replace(ROUTES.LOGIN);
                    }
                } catch {
                    if (mounted) router.replace(ROUTES.LOGIN);
                }
            } else {
                if (mounted) setIsCheckingAuth(false);
            }
        };

        checkAuth();
        return () => { mounted = false; };
    }, [router]);

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

    if (isCheckingAuth) {
        return (
            <div className="h-dvh w-full flex flex-col gap-4 items-center justify-center bg-sidebar text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Securing session...</p>
            </div>
        );
    }

    return (
        <div className="bg-sidebar h-dvh w-full overflow-hidden text-foreground transition-colors duration-300">
            <div className="flex h-full w-full">
                <Sidebar />
                <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden relative">
                    <div
                        className={`z-20 shrink-0 border-b bg-sidebar overflow-y-auto [scrollbar-gutter:stable] transition-all duration-300 ease-in-out ${isScrolled ? "border-border/50 shadow-sm" : "border-transparent"} ${isHeaderHidden ? "-mt-16 opacity-0 pointer-events-none md:mt-0 md:pointer-events-auto md:opacity-100" : "mt-0 opacity-100"}`}
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
                        className="relative min-h-0 flex-1 overflow-y-auto bg-sidebar [scrollbar-gutter:stable]"
                        onScroll={handleScroll}
                    >
                        <div
                            className={`${DASHBOARD_CONTENT_SHELL_CLASS} pb-4 pt-8 md:pb-8 md:pt-12 lg:pb-10 lg:pt-12`}
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
