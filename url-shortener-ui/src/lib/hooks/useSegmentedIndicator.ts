"use client";

import {useLayoutEffect, useRef, useState, type RefObject} from "react";

export interface SegmentedIndicator {
    x: number;
    width: number;
    isReady: boolean;
    shouldAnimate: boolean;
}

const HIDDEN_INDICATOR: SegmentedIndicator = {x: 0, width: 0, isReady: false, shouldAnimate: false};

function measureSelected(selected: HTMLElement | null): Omit<SegmentedIndicator, "shouldAnimate"> | null {
    if (!selected) return null;
    return {x: selected.offsetLeft, width: selected.offsetWidth, isReady: true};
}

/**
 * Places the sliding thumb under the selected option. Measured before paint, so the first frame already shows the
 * selection; the container is observed too, because an earlier option changing width moves the selected one.
 */
export function useSegmentedIndicator(
    selectedRef: RefObject<HTMLElement | null>,
    containerRef: RefObject<HTMLElement | null>,
    value: string,
): SegmentedIndicator {
    const [indicator, setIndicator] = useState<SegmentedIndicator>(HIDDEN_INDICATOR);
    const hasMeasured = useRef(false);

    useLayoutEffect(() => {
        function syncIndicator(animate: boolean): void {
            const geometry = measureSelected(selectedRef.current);
            if (geometry === null) {
                hasMeasured.current = false;
                setIndicator(HIDDEN_INDICATOR);
                return;
            }
            hasMeasured.current = true;
            setIndicator((previous) => {
                // ResizeObserver delivers an initial notification after every selection change.
                // Preserve the transition when that notification reports the geometry already measured.
                if (!animate && previous.isReady && previous.x === geometry.x && previous.width === geometry.width) {
                    return previous;
                }
                return {...geometry, shouldAnimate: animate};
            });
        }

        syncIndicator(hasMeasured.current);

        const selected = selectedRef.current;
        if (!selected || typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(() => syncIndicator(false));
        observer.observe(selected);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [selectedRef, containerRef, value]);

    return indicator;
}
