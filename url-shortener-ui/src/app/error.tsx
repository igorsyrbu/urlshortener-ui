"use client";

import {ErrorView, type BoundaryErrorProps} from "@/components/layout/ErrorView";

export default function RootError({error, reset}: BoundaryErrorProps) {
    return (
        <ErrorView
            error={error}
            reset={reset}
            title="Something went wrong!"
            description="An unexpected error occurred in the application."
            logMessage="Root boundary caught error"
        />
    );
}
