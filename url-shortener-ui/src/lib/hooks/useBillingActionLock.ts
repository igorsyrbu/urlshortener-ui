"use client";

import {useCallback, useRef, useState} from "react";

export interface BillingActionLock {
    isLocked: boolean;
    /** Runs `action` unless another billing action is running; a call made meanwhile is ignored, not queued. */
    run: (action: () => Promise<void>) => Promise<void>;
}

/**
 * One lock for Upgrade, Manage and Switch. The ref closes the gap before React re-renders, so two calls in the same
 * tick still send one request; the state disables every action button while one runs.
 */
export function useBillingActionLock(): BillingActionLock {
    const isRunningRef = useRef(false);
    const [isLocked, setIsLocked] = useState(false);

    const run = useCallback(async (action: () => Promise<void>): Promise<void> => {
        if (isRunningRef.current) return;
        isRunningRef.current = true;
        setIsLocked(true);
        await action().finally(() => {
            isRunningRef.current = false;
            setIsLocked(false);
        });
    }, []);

    return {isLocked, run};
}
