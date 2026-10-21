"use client";

import {useCallback, useEffect, useRef} from "react";

/**
 * Hands out an `AbortSignal` per action and aborts the latest one when the component unmounts, so a request that
 * finishes after the user left the page can be ignored instead of redirecting or opening a tab from another page.
 */
export function useAbortOnUnmount(): () => AbortSignal {
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => () => controllerRef.current?.abort(), []);

    return useCallback((): AbortSignal => {
        const controller = new AbortController();
        controllerRef.current = controller;
        return controller.signal;
    }, []);
}
