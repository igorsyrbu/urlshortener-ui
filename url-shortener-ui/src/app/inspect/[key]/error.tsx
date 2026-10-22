"use client";

import {ErrorView, type BoundaryErrorProps} from "@/components/layout/ErrorView";

export default function InspectError({error, reset}: BoundaryErrorProps) {
    return (
        <ErrorView
            error={error}
            reset={reset}
            title="Preview unavailable"
            description="We couldn't load this link's preview right now. Try again in a moment."
            logMessage="Inspect boundary caught error"
        />
    );
}
