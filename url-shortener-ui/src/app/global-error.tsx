"use client";

import "./globals.css";
import {useEffect} from "react";
import type {BoundaryErrorProps} from "@/components/layout/ErrorView";
import {logger} from "@/lib/logger";

// Replaces the root layout when that layout itself fails, so it brings its own document and styles. Next ships it
// with every route, so it stays free of shared UI components to keep that cost small.
export default function GlobalError({error, reset}: BoundaryErrorProps) {
    useEffect(() => {
        logger.error("Global boundary caught error", error, {digest: error.digest});
    }, [error]);

    return (
        <html lang="en">
        <body className="font-sans antialiased bg-background text-foreground">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
            <h2 className="text-xl font-bold tracking-tight">Something went wrong!</h2>
            <p className="max-w-md text-sm text-muted-foreground">The app could not start. Try again, or reload the page.</p>
            <button
                type="button"
                onClick={() => reset()}
                className="mt-4 h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                Try again
            </button>
        </main>
        </body>
        </html>
    );
}
