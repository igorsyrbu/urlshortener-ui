"use client";

import {useEffect} from "react";
import {PanelLeft} from "lucide-react";
import {Kbd} from "@/components/ui/kbd";
import {ModeToggle} from "@/components/layout/ThemeToggle";
import {Button} from "@/components/ui/button";
import {PageHeading} from "@/components/layout/PageHeading";
import {usePathname} from "next/navigation";
import {isModalOpen} from "@/lib/utils";

interface HeaderProps {
    onCreateClick?: () => void;
    onMenuClick?: () => void;
    createLabel?: string;
}

export function Header({onCreateClick, onMenuClick, createLabel = "Create link"}: HeaderProps) {
    const pathname = usePathname();

    const titles: Record<string, string> = {
        "/links": "Links",
        "/tags": "Tags",
        "/dashboard": "Dashboard",
        "/analytics": "Analytics",
        "/settings": "Settings",
    };
    const title = titles[pathname] ?? "";

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCreateShortcut =
                e.key.toLowerCase() === "c" &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName);

            if (isCreateShortcut) {
                if (isModalOpen()) return;
                e.preventDefault();
                onCreateClick?.();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onCreateClick]);

    return (
        <header className="h-16 w-full shrink-0 bg-transparent">
            <div className="flex h-full w-full items-center gap-2 sm:gap-4">
                {onMenuClick ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 lg:hidden"
                        onClick={onMenuClick}
                        aria-label="Open navigation menu"
                    >
                        <PanelLeft className="size-5"/>
                    </Button>
                ) : null}
                <PageHeading>{title}</PageHeading>
                <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
                    <ModeToggle/>
                    <Button
                        type="button"
                        onClick={onCreateClick}
                        className="ml-1 sm:ml-2"
                    >
                        <span className="text-xs font-bold tracking-wider uppercase">{createLabel}</span>
                        <Kbd
                            className="hidden h-5 min-w-5 justify-center border-primary-foreground/20 bg-primary-foreground/20 px-1.5 text-primary-foreground sm:flex">
                            C
                        </Kbd>
                    </Button>
                </div>
            </div>
        </header>
    );
}
