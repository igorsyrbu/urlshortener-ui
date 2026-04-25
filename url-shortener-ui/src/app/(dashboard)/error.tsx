"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard boundary caught error:", error);
    }, [error]);

    return (
        <div className="flex h-full w-full min-h-[50vh] flex-col items-center justify-center text-foreground gap-4">
            <div className="flex items-center justify-center p-3 rounded-full bg-destructive/10 mb-2">
                <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Failed to load content</h2>
            <p className="text-muted-foreground text-sm max-w-sm text-center">
                An unexpected error occurred while trying to display this section.
            </p>
            <Button onClick={() => reset()} variant="outline" className="mt-4">
                Try again
            </Button>
        </div>
    );
}
