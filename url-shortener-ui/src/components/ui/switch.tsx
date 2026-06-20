"use client";

import React from "react";
import {cn} from "@/lib/utils";

interface SwitchProps {
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
    className?: string;
    size?: "default" | "sm";
    readOnly?: boolean;
}

export function Switch({
                           checked,
                           onCheckedChange,
                           className,
                           size = "default",
                           readOnly = false,
                       }: SwitchProps) {
    const trackClass = cn(
        "relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        size === "sm" ? "h-4 w-8" : "h-6 w-11",
        !readOnly && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-muted",
        className
    );

    const thumbClass = cn(
        "pointer-events-none inline-block rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ease-in-out",
        size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5",
        checked
            ? size === "sm"
                ? "translate-x-3.5"
                : "translate-x-5"
            : "translate-x-0"
    );

    if (readOnly) {
        return (
            <span className={trackClass} aria-hidden="true">
                <span className={thumbClass}/>
            </span>
        );
    }

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange?.(!checked)}
            className={trackClass}
        >
            <span className={thumbClass}/>
        </button>
    );
}
