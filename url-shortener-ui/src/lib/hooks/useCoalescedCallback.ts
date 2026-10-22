"use client";

import {useCallback, useEffect, useLayoutEffect, useRef} from "react";

interface PendingCall<T> {
    value: T;
    cancel: () => void;
}

export interface CoalescedCallback<T> {
    /** Queues `value`; only the latest queued value reaches the callback. */
    schedule: (value: T) => void;
    /** Runs the queued call now, if any. */
    flush: () => void;
}

function startWait(run: () => void, waitMs: number | undefined): () => void {
    if (waitMs === undefined) {
        const frame = requestAnimationFrame(run);
        return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(run, waitMs);
    return () => clearTimeout(timer);
}

/**
 * Collapses bursts of calls into one: on the next animation frame when `waitMs` is omitted, otherwise `waitMs` after
 * the last call. A call still queued when the component unmounts runs then, so nothing is lost.
 */
export function useCoalescedCallback<T>(callback: (value: T) => void, waitMs?: number): CoalescedCallback<T> {
    const callbackRef = useRef(callback);
    const pendingRef = useRef<PendingCall<T> | null>(null);

    useLayoutEffect(() => {
        callbackRef.current = callback;
    });

    const flush = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending) return;
        pendingRef.current = null;
        pending.cancel();
        callbackRef.current(pending.value);
    }, []);

    const schedule = useCallback((value: T) => {
        const pending = pendingRef.current;
        if (pending && waitMs === undefined) {
            pending.value = value;
            return;
        }
        pending?.cancel();
        pendingRef.current = {value, cancel: startWait(flush, waitMs)};
    }, [flush, waitMs]);

    useEffect(() => flush, [flush]);

    return {schedule, flush};
}
