"use client";

import {useEffect} from "react";
import {PanelLeft} from "lucide-react";
import {Kbd, KbdGroup} from "@/components/ui/kbd";
import {ModeToggle} from "@/components/layout/ThemeToggle";
import {Button} from "@/components/ui/button";

interface HeaderProps {
    onCreateClick?: () => void;
    onMenuClick?: () => void;
}

export function Header({onCreateClick, onMenuClick}: HeaderProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key.toLowerCase() === "c" &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
            ) {
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
                <div className="min-w-0 flex-1 max-w-lg">
                    <div className="group relative w-full">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                            <span
                                className="material-symbols-outlined text-[18px] text-muted-foreground sm:text-[20px]">
                                search
                            </span>
                        </div>
                        <input
                            className="block w-full truncate rounded-xl border-none bg-muted py-2 pr-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-0 focus:outline-none sm:py-2.5 sm:pr-12 pl-8 sm:pl-10"
                            placeholder="Search..."
                            type="text"
                        />
                        <div
                            className="pointer-events-none absolute inset-y-0 right-0 hidden items-center pr-4 sm:flex">
                            <KbdGroup>
                                <Kbd
                                    className="min-w-5 justify-center border-border bg-transparent px-1 text-muted-foreground">
                                    ⌘+K
                                </Kbd>
                            </KbdGroup>
                        </div>
                    </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
                    <ModeToggle/>
                    <button
                        type="button"
                        onClick={onCreateClick}
                        className="ml-1 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 sm:ml-2 sm:gap-2 sm:px-4"
                    >
                        <span className="text-xs font-bold tracking-wider uppercase">Create</span>
                        <Kbd
                            className="hidden h-5 min-w-5 justify-center border-primary-foreground/20 bg-primary-foreground/20 px-1.5 text-primary-foreground sm:flex">
                            C
                        </Kbd>
                    </button>
                </div>
            </div>
        </header>
    );
}
