"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";
import type { TrackerEntry } from "@/lib/url-cleaner-utils";
import { getBaseUrl } from "@/lib/url-cleaner-utils";

interface TrackerReviewScreenProps {
    cleanedUrl: string;
    entries: TrackerEntry[];
    kept: Set<string>;
    onToggle: (key: string) => void;
    onBack: () => void;
    onApply: () => void;
}

export function TrackerReviewScreen({
    cleanedUrl,
    entries,
    kept,
    onToggle,
    onBack,
    onApply,
}: TrackerReviewScreenProps) {
    const baseUrl = getBaseUrl(cleanedUrl);
    const hasQuery = entries.length > 0;
    const isDesktop = useIsDesktop();

    return (
        <div className="flex flex-col gap-4">
            {isDesktop ? (
                <h2 className="text-sm font-medium text-foreground">Review trackers</h2>
            ) : (
                <div className="relative flex items-center justify-center h-8 w-full">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        aria-label="Back to form"
                        className="absolute left-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    <h2 className="text-lg font-semibold text-foreground text-center leading-none">Review trackers</h2>
                </div>
            )}

            <p className="text-sm text-muted-foreground">
                Click a piece of the link to keep or remove it.
            </p>

            <div className="rounded-xl border border-border bg-card p-4 max-h-64 overflow-y-auto overscroll-contain">
                <div className="flex flex-wrap items-center gap-1.5 text-sm leading-6 break-all">
                    <span className="font-mono text-sm text-foreground">{hasQuery ? `${baseUrl}?` : baseUrl}</span>
                    {entries.map((entry, idx) => {
                        const isKept = kept.has(entry.key);
                        return (
                            <span key={`${entry.key}-${idx}`} className="inline-flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onToggle(entry.key)}
                                    className={
                                        isKept
                                            ? "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary transition-colors"
                                            : "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/20 px-2.5 py-1 text-sm font-medium text-muted-foreground opacity-60 transition-colors"
                                    }
                                    aria-pressed={isKept}
                                    aria-label={`${isKept ? "Keep" : "Remove"} tracker ${entry.display}`}
                                >
                                    <span
                                        className={
                                            isKept
                                                ? "size-1.5 rounded-full bg-primary shrink-0"
                                                : "size-1.5 rounded-full bg-muted-foreground shrink-0"
                                        }
                                        aria-hidden="true"
                                    />
                                    {entry.display}
                                </button>
                                {idx < entries.length - 1 ? (
                                    <span className="text-muted-foreground">&</span>
                                ) : null}
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-primary/80" aria-hidden="true" />
                    Tracker kept
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-muted-foreground/40" aria-hidden="true" />
                    Removed
                </span>
            </div>

            {isDesktop ? (
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onBack}>
                        Back
                    </Button>
                    <Button
                        type="button"
                        onClick={onApply}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Apply
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    <Button
                        type="button"
                        onClick={onApply}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Apply
                    </Button>
                    <Button type="button" variant="ghost" onClick={onBack} className="w-full">
                        Back
                    </Button>
                </div>
            )}
        </div>
    );
}
