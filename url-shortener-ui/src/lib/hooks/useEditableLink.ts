"use client";

import {useEffect, useState} from "react";
import {EDIT_FORM_FORGET_DELAY_MS} from "@/lib/constants";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";
import {getLinkById} from "@/lib/links-api";
import {logger} from "@/lib/logger";
import type {EditableLink} from "@/lib/types";

interface LoadedLink {
    linkId: string;
    /** `null` when the load failed. */
    link: EditableLink | null;
}

interface EditableLinkState {
    link: EditableLink | null;
    isLoading: boolean;
    hasFailed: boolean;
    retry: () => void;
}

async function loadEditableLink(linkId: string, signal: AbortSignal): Promise<LoadedLink | null> {
    try {
        return {linkId, link: await getLinkById(linkId, signal)};
    } catch (error) {
        if (signal.aborted) return null;
        logger.error("Failed to load the link to edit", error, {linkId});
        return {linkId, link: null};
    }
}

/**
 * The link as the server has it now, password included, for as long as the edit form is open. Every opening loads it
 * again and closing forgets it, because the password may not outlive the form.
 */
export function useEditableLink(linkId: string | null, isOpen: boolean): EditableLinkState {
    const [loaded, setLoaded] = useState<LoadedLink | null>(null);
    const [attemptCount, setAttemptCount] = useState(0);

    useOnValueChange(isOpen, (isNowOpen) => {
        if (isNowOpen) setLoaded(null);
    });

    useEffect(() => {
        if (!isOpen || linkId === null) return undefined;
        const controller = new AbortController();
        void loadEditableLink(linkId, controller.signal).then((result) => {
            if (result !== null) setLoaded(result);
        });
        return () => controller.abort();
    }, [isOpen, linkId, attemptCount]);

    useEffect(() => {
        if (isOpen) return undefined;
        // Waiting for the close animation keeps the form from turning into a spinner while it fades out.
        const timeoutId = setTimeout(() => setLoaded(null), EDIT_FORM_FORGET_DELAY_MS);
        return () => clearTimeout(timeoutId);
    }, [isOpen]);

    const current = loaded !== null && loaded.linkId === linkId ? loaded : null;
    const retry = (): void => {
        setLoaded(null);
        setAttemptCount((count) => count + 1);
    };

    return {
        link: current === null ? null : current.link,
        isLoading: current === null,
        hasFailed: current !== null && current.link === null,
        retry,
    };
}
