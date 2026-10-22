"use client";

import {ErrorView, type BoundaryErrorProps} from "@/components/layout/ErrorView";

export default function LegalError({error, reset}: BoundaryErrorProps) {
    return (
        <ErrorView
            error={error}
            reset={reset}
            title="This page could not load"
            description="Something went wrong while opening this page. Try again in a moment."
            logMessage="Legal pages boundary caught error"
        />
    );
}
