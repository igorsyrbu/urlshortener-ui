"use client";

import {useEffect, useRef} from "react";
import {Search} from "lucide-react";
import {Kbd, KbdGroup} from "@/components/ui/kbd";
import {Input} from "@/components/ui/input";
import {cn, isModalOpen} from "@/lib/utils";

interface SearchBarProps {
    placeholder?: string;
    className?: string;
}

export function SearchBar({placeholder = "Search...", className}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isSearchShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
            if (isSearchShortcut && inputRef.current) {
                if (isModalOpen()) return;
                e.preventDefault();
                inputRef.current.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className={cn("group relative w-full", className)}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                <Search className="size-4.5 text-muted-foreground sm:size-5"/>
            </div>
            <Input
                ref={inputRef}
                className="block w-full truncate rounded-xl border-[0.5px] border-border bg-background dark:bg-background h-10 py-2 pr-3 text-sm text-foreground shadow-none transition-all placeholder:text-muted-foreground focus:bg-background dark:focus:bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-background sm:pr-12 pl-8 sm:pl-10"
                placeholder={placeholder}
                type="text"
                onKeyDown={(e) =>
                    e.key === "Escape" && inputRef.current?.blur()
                }
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center pr-4 sm:flex">
                <KbdGroup>
                    <Kbd
                        className="min-w-5 justify-center border-border bg-transparent px-1 text-muted-foreground">
                        ⌘K
                    </Kbd>
                </KbdGroup>
            </div>
        </div>
    );
}
