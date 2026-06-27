"use client";

import {useEffect, useState} from "react";
import {MOBILE_BREAKPOINT_PX} from "@/lib/constants";

export function useMediaQuery(query: string): boolean {
    const [value, setValue] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window === "undefined") return;

        const result = window.matchMedia(query);
        setValue(result.matches);

        function onChange(event: MediaQueryListEvent) {
            setValue(event.matches);
        }

        result.addEventListener("change", onChange);
        return () => result.removeEventListener("change", onChange);
    }, [query]);

    return isMounted ? value : false;
}

export function useIsDesktop(): boolean {
    return useMediaQuery(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);
}

export function useIsMobile(): boolean {
    return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
}
