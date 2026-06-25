"use client";

import React from "react";

interface MagicLinkCooldownMessageProps {
    remainingSeconds: number;
}

function formatCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function MagicLinkCooldownMessage({remainingSeconds}: MagicLinkCooldownMessageProps) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">
                Didn&apos;t get it? Resend in
            </span>
            <span
                className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground">
                {formatCountdown(remainingSeconds)}
            </span>
        </div>
    );
}
