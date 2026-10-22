"use client";

import {ErrorView, type BoundaryErrorProps} from "@/components/layout/ErrorView";

export default function AuthError({error, reset}: BoundaryErrorProps) {
    return (
        <ErrorView
            error={error}
            reset={reset}
            title="Sign-in could not finish"
            description="Something went wrong while signing you in. Try again, or request a new sign-in link."
            logMessage="Sign-in boundary caught error"
        />
    );
}
