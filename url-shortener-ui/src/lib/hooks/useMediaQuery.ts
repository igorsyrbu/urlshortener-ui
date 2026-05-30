"use client";

import {useEffect, useState} from "react";

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
