"use client";

import {useEffect} from "react";
import {Button} from "@/components/ui/button";
import {AlertCircle} from "lucide-react";

export default function GlobalError({
                                        error,
                                        reset,
                                    }: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global boundary caught error:", error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground gap-4">
            <div className="flex items-center justify-center p-4 rounded-full bg-destructive/10 mb-2">
                <AlertCircle className="w-10 h-10 text-destructive"/>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Something went wrong!</h2>
            <p className="text-muted-foreground text-sm max-w-md text-center">
                An unexpected error occurred in the application.
            </p>
            <Button onClick={() => reset()} className="mt-4">
                Try again
            </Button>
        </div>
    );
}
