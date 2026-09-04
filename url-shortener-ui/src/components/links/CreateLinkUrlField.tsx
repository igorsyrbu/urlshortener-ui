"use client";

import {useEffect, useRef} from "react";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {UrlCleanerBanner} from "@/components/links/UrlCleanerBanner";
import {UrlCleanerSuccessBanner} from "@/components/links/UrlCleanerSuccessBanner";
import type {UrlCleanerResponse} from "@/lib/api-types";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";

interface CreateLinkUrlFieldProps {
    inputId: string;
    value: string;
    urlError: string | null;
    cleanerResult: UrlCleanerResponse | null;
    cleanedTrackerCount: number | null;
    onChange: (value: string) => void;
    onBlur: () => void;
    onClean: () => void;
    onReview: () => void;
}

export function CreateLinkUrlField({
    inputId,
    value,
    urlError,
    cleanerResult,
    cleanedTrackerCount,
    onChange,
    onBlur,
    onClean,
    onReview,
}: CreateLinkUrlFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isDesktop = useIsDesktop();

    useEffect(() => {
        if (!isDesktop) return;
        if (value) return;
        const id = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(id);
    }, [isDesktop, value]);

    return (
        <div className="grid gap-2">
            <label htmlFor={inputId} className="text-sm font-medium">
                Destination URL
            </label>
            <div className="flex gap-2">
                <Input
                    ref={inputRef}
                    id={inputId}
                    placeholder="https://example.com/long-url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    className={cn(
                        "col-span-3",
                        urlError && "border-destructive focus-visible:border-destructive",
                    )}
                    required
                />
            </div>
            {cleanedTrackerCount !== null ? (
                <UrlCleanerSuccessBanner trackerCount={cleanedTrackerCount} />
            ) : cleanerResult ? (
                <UrlCleanerBanner
                    trackerCount={cleanerResult.removedParams.length}
                    onClean={onClean}
                    onReview={onReview}
                />
            ) : null}
            {urlError ? <p className="-mt-1 text-xs text-destructive">{urlError}</p> : null}
        </div>
    );
}
