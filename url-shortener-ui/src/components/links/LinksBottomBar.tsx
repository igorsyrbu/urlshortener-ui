"use client";

import type {ReactNode} from "react";
import {AnimatePresence, LazyMotion, m, MotionConfig, type Transition} from "framer-motion";
import {cn} from "@/lib/utils";

interface LinksBottomBarProps {
    ariaLabel: string;
    /** Changing it cross-fades the bar's contents while the bar morphs to their size. */
    contentKey: string;
    children: ReactNode;
    /** A control beside the bar, such as a round button; it scales in and out as it comes and goes. */
    aside?: ReactNode;
}

/** The floating surface the bar and anything beside it share. */
export const FLOATING_BAR_SURFACE_CLASS =
    "border-[0.5px] border-border bg-background/90 shadow-lg shadow-black/10 backdrop-blur-md dark:shadow-lg dark:shadow-black/50 dark:border-t-foreground/20";

const MORPH_TRANSITION: Transition = {type: "spring", bounce: 0.15, duration: 0.35};
const FADE_TRANSITION: Transition = {duration: 0.15, ease: "easeOut"};

function loadMotionFeatures() {
    return import("@/lib/motion-features").then((featuresModule) => featuresModule.default);
}

/**
 * The bar that floats at the bottom of the links page, beside the sidebar, holding pagination or the selection.
 * On phones it spans the content width less a 0.5rem inset on each side and sits 1.5rem above the home indicator (the
 * blurred fade under it grows to match); from `sm` it fits its content. In dark mode a brighter top edge and a soft dark
 * halo keep it apart from the cards, which share its fill. It stays mounted when its contents change: the old contents
 * fade out as the new ones fade in, and the bar morphs to their width (framer-motion `layout`; CSS cannot animate to an
 * intrinsic width in Safari).
 */
export function LinksBottomBar({ariaLabel, contentKey, children, aside}: LinksBottomBarProps) {
    return (
        <LazyMotion features={loadMotionFeatures} strict>
            <MotionConfig reducedMotion="user">
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[calc(env(safe-area-inset-bottom,0px)+6rem)] sm:h-20 bg-linear-to-t from-sidebar via-sidebar/60 to-transparent backdrop-blur-md mask-[linear-gradient(to_top,black,transparent)] lg:hidden"
                />
                <div
                    className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-30 flex justify-center gap-2 px-6 sm:px-4 lg:left-60">
                    <m.nav
                        layout
                        transition={MORPH_TRANSITION}
                        aria-label={ariaLabel}
                        style={{borderRadius: 12}}
                        className={cn("pointer-events-auto relative flex w-full min-w-0 max-w-full items-center overflow-hidden px-2 py-1 sm:inline-flex sm:w-auto",
                            FLOATING_BAR_SURFACE_CLASS)}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            <m.div
                                key={contentKey}
                                layout="position"
                                initial={{opacity: 0, y: 6}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, y: -6}}
                                transition={FADE_TRANSITION}
                                className="flex w-full min-w-0 items-center gap-1"
                            >
                                {children}
                            </m.div>
                        </AnimatePresence>
                    </m.nav>
                    <AnimatePresence mode="popLayout" initial={false}>
                        {aside && (
                            <m.div
                                key="aside"
                                layout
                                initial={{opacity: 0, scale: 0.6}}
                                animate={{opacity: 1, scale: 1}}
                                exit={{opacity: 0, scale: 0.6}}
                                transition={MORPH_TRANSITION}
                                className="pointer-events-auto flex shrink-0 self-center sm:hidden"
                            >
                                {aside}
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </MotionConfig>
        </LazyMotion>
    );
}
