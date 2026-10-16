"use client";

import {useEffect, useRef, useState} from "react";
import {toast} from "sonner";
import {COPY_FAILED_LOG_MESSAGE, COPY_FAILED_MESSAGE, COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import {logger} from "@/lib/logger";

interface CopyToClipboard {
    isCopied: boolean;
    copy: (text: string) => Promise<void>;
}

export function useCopyToClipboard(failureMessage: string = COPY_FAILED_MESSAGE): CopyToClipboard {
    const [isCopied, setIsCopied] = useState(false);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(resetTimerRef.current), []);

    const copy = async (text: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            logger.error(COPY_FAILED_LOG_MESSAGE, error);
            toast.error(failureMessage);
            return;
        }
        setIsCopied(true);
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => setIsCopied(false), COPY_FEEDBACK_DURATION_MS);
    };

    return {isCopied, copy};
}
