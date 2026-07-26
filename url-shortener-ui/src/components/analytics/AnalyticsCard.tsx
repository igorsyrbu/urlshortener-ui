"use client";

import {cn} from "@/lib/utils";
import React from "react";

interface AnalyticsCardTabConfig {
    label: string;
    value: string;
    isActive: boolean;
}

interface AnalyticsCardProps {
    title?: string;
    tabs?: AnalyticsCardTabConfig[];
    onTabChange?: (value: string) => void;
    children: React.ReactNode;
}

export function AnalyticsCard({title, tabs, onTabChange, children}: AnalyticsCardProps) {
    return (
        <div className="flex flex-col rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between border-b-[0.5px] border-border pb-2">
                {title && !tabs ? (
                    <span className="-mb-2.5 border-b-2 border-foreground pb-2 text-sm font-bold text-foreground">
                        {title}
                    </span>
                ) : null}
                {tabs ? (
                    <div className="flex items-center gap-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => onTabChange?.(tab.value)}
                                className={cn(
                                    "-mb-2.5 pb-2 text-sm font-bold transition-colors",
                                    tab.isActive
                                        ? "border-b-2 border-foreground text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                ) : null}
                <span className="mr-3 text-sm font-bold text-muted-foreground">Clicks</span>
            </div>
            <div className="flex flex-1 flex-col gap-5">{children}</div>
        </div>
    );
}
