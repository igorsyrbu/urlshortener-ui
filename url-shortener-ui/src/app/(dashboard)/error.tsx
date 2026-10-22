"use client";

import {ErrorView, type BoundaryErrorProps} from "@/components/layout/ErrorView";

export default function DashboardError({error, reset}: BoundaryErrorProps) {
    return (
        <ErrorView
            error={error}
            reset={reset}
            title="Failed to load content"
            description="An unexpected error occurred while trying to display this section."
            logMessage="Dashboard boundary caught error"
            variant="section"
        />
    );
}
