"use client";

import {useState} from "react";
import {usePrefersReducedMotion} from "@/lib/hooks/useMediaQuery";

export interface FirstDrawAnimation {
    isAnimationActive: boolean;
    handleAnimationEnd: () => void;
}

/**
 * Recharts replays a bar chart's animation on every data change and hides the bar labels until it ends, so the labels
 * would blink. Animate only the chart's first draw (and never with reduced motion), so later data swaps in place.
 */
export function useFirstDrawAnimation(): FirstDrawAnimation {
    const [isFirstDraw, setIsFirstDraw] = useState(true);
    const prefersReducedMotion = usePrefersReducedMotion();
    return {
        isAnimationActive: isFirstDraw && !prefersReducedMotion,
        handleAnimationEnd: () => setIsFirstDraw(false),
    };
}
