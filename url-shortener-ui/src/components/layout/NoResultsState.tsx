"use client";

import {MousePointerClick} from "lucide-react";
import type {LucideIcon} from "lucide-react";

const SCROLL_ITEM_COUNT = 30;
const LOOP_COUNT = 2;

interface NoResultsStateProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    itemHeightClass: string;
    pillWidthClass: string;
}

export function NoResultsState({icon: Icon, title, subtitle, itemHeightClass, pillWidthClass}: NoResultsStateProps) {
    return (
        <div
            className="flex flex-col items-center justify-center py-20 px-4 bg-background border-[0.5px] border-border rounded-xl relative overflow-hidden">
            <div
                className="flex flex-col items-center pointer-events-none select-none h-44 overflow-hidden relative w-full mb-8 mask-[linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
                <div
                    className="absolute inset-x-0 top-0 h-16 z-10 backdrop-blur-[3px] bg-background/10 mask-[linear-gradient(to_bottom,black,transparent)]"/>
                <div
                    className="absolute inset-x-0 bottom-0 h-16 z-10 backdrop-blur-[3px] bg-background/10 mask-[linear-gradient(to_top,black,transparent)]"/>

                <div className="animate-vertical-scroll flex flex-col gap-3">
                    {[...Array(LOOP_COUNT)].map((_, loopIndex) => (
                        <div key={loopIndex} className="flex flex-col gap-3 pb-3">
                            {[...Array(SCROLL_ITEM_COUNT)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`shrink-0 mx-auto w-70 sm:w-[320px] ${itemHeightClass} bg-background border-[0.5px] border-border/80 rounded-xl flex items-center px-4 transition-all duration-300 opacity-100`}
                                >
                                    <Icon className="size-4 text-muted-foreground/50 mr-3 shrink-0"/>
                                    <div
                                        className={`h-2.5 ${pillWidthClass} bg-muted-foreground/20 rounded-full shrink-0`}/>
                                    <MousePointerClick className="size-4 text-muted-foreground/40 ml-auto shrink-0"/>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative z-20 flex flex-col items-center">
                <h3 className="text-lg font-bold text-foreground mb-2 text-center">{title}</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">{subtitle}</p>
            </div>
        </div>
    );
}
