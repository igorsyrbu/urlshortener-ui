"use client";

import {useState} from "react";

/**
 * `false` until `isOpen` is first `true`, then `true` for good. Mount a lazily loaded dialog behind it: its code is
 * fetched on the first open, and it is never unmounted afterwards, so the close animation and form state behave as
 * with an always-mounted dialog.
 */
export function useHasBeenOpened(isOpen: boolean): boolean {
    const [hasBeenOpened, setHasBeenOpened] = useState(isOpen);
    if (isOpen && !hasBeenOpened) {
        setHasBeenOpened(true);
    }
    return hasBeenOpened || isOpen;
}
