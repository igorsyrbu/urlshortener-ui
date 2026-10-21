"use client";

import {useCallback, useEffect, useState} from "react";

const MS_PER_SECOND = 1000;

export interface Cooldown {
    isCoolingDown: boolean;
    /** Starts a pause of `seconds`; a missing or non-positive delay starts none (the message then says "shortly"). */
    startCooldown: (seconds: number | null) => void;
}

/** A short pause after a rate limit, so the user cannot earn another 429 by pressing the button again at once. */
export function useCooldown(): Cooldown {
    const [endsAtMs, setEndsAtMs] = useState<number | null>(null);

    useEffect(() => {
        if (endsAtMs === null) return undefined;
        const timeoutId = setTimeout(() => setEndsAtMs(null), Math.max(0, endsAtMs - Date.now()));
        return () => clearTimeout(timeoutId);
    }, [endsAtMs]);

    const startCooldown = useCallback((seconds: number | null): void => {
        if (seconds !== null && seconds > 0) setEndsAtMs(Date.now() + seconds * MS_PER_SECOND);
    }, []);

    return {isCoolingDown: endsAtMs !== null, startCooldown};
}
