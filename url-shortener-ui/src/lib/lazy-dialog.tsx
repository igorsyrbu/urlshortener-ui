"use client";

import {useEffect, useState, type ComponentType} from "react";
import {logger} from "@/lib/logger";

const LAZY_DIALOG_LOAD_ERROR = "Failed to load a dialog";

export type LazyDialog<Props> = ComponentType<Props> & {
    /** Starts the download (once) and resolves when the dialog can open without waiting; never rejects. */
    preload: () => Promise<void>;
};

/**
 * A dialog or drawer whose code is downloaded on demand. Unlike `next/dynamic` it does not go through Suspense:
 * React holds a suspended tree back for 300 ms after its (empty) fallback commits, which delayed the first open of
 * every dialog even when its chunk was already preloaded. Once loaded, the dialog renders in the same commit that
 * opens it; until then it renders nothing.
 */
export function lazyDialog<Props extends object>(load: () => Promise<ComponentType<Props>>): LazyDialog<Props> {
    let Loaded: ComponentType<Props> | null = null;
    let pending: Promise<void> | null = null;

    const preload = (): Promise<void> => {
        pending ??= load().then(
            (component) => {
                Loaded = component;
            },
            (error: unknown) => {
                pending = null;
                logger.error(LAZY_DIALOG_LOAD_ERROR, error);
            },
        );
        return pending;
    };

    function LazyDialogBoundary(props: Props) {
        const [Component, setComponent] = useState<ComponentType<Props> | null>(() => Loaded);

        // No dependency list: after a failed download the next render (the user reopening the dialog) tries again.
        useEffect(() => {
            if (Component !== null) return;
            let isCurrent = true;
            void preload().then(() => {
                if (isCurrent && Loaded !== null) setComponent(() => Loaded);
            });
            return () => {
                isCurrent = false;
            };
        });

        return Component === null ? null : <Component {...props}/>;
    }

    return Object.assign(LazyDialogBoundary, {preload});
}
