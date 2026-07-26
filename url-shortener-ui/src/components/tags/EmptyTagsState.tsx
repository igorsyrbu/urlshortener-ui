"use client";

import {Tag as TagIcon, MousePointerClick} from "lucide-react";
import {useUIStore} from "@/lib/store/ui";
import {Button} from "@/components/ui/button";

const SCROLL_ITEM_COUNT = 30;
const LOOP_COUNT = 2;

export function EmptyTagsState() {
    const {setCreateTagModalOpen} = useUIStore();

    return (
        <div
            className="flex flex-col items-center justify-center py-20 px-4 bg-card border-[0.5px] border-border rounded-xl relative overflow-hidden">
            <div
                className="flex flex-col items-center pointer-events-none select-none h-44 overflow-hidden relative w-full mb-8 mask-[linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
                {/* Blur Overlays */}
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
                                    className="shrink-0 mx-auto w-70 sm:w-[320px] h-10 bg-background border-[0.5px] border-border/80 rounded-xl flex items-center px-4 transition-all duration-300 opacity-100"
                                >
                                    <TagIcon className="size-4 text-muted-foreground/50 mr-3 shrink-0"/>
                                    <div className="h-2.5 w-16 bg-muted-foreground/20 rounded-full shrink-0"/>
                                    <MousePointerClick className="size-4 text-muted-foreground/40 ml-auto shrink-0"/>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative z-20 flex flex-col items-center">
                <h3 className="text-lg font-bold text-foreground mb-2 text-center">Your tags will live here</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                    Organize your links with tags. Create your first tag to get started.
                </p>
                <Button
                    onClick={() => setCreateTagModalOpen(true)}
                    className="h-9 px-3 sm:px-4 rounded-lg text-xs font-bold uppercase tracking-wider active:scale-95"
                >
                    Create Tag
                </Button>
            </div>
        </div>
    );
}
