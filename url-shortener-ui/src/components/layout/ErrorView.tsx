"use client";

import {useEffect} from "react";
import {AlertCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {logger} from "@/lib/logger";

export interface BoundaryErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

interface ErrorViewProps extends BoundaryErrorProps {
    title: string;
    description: string;
    logMessage: string;
    variant?: "page" | "section";
}

export function ErrorView({error, reset, title, description, logMessage, variant = "page"}: ErrorViewProps) {
    const isSection = variant === "section";

    useEffect(() => {
        logger.error(logMessage, error, {digest: error.digest});
    }, [error, logMessage]);

    return (
        <div className={cn(
            "flex w-full flex-col items-center justify-center gap-4 px-4 text-center text-foreground",
            isSection ? "h-full min-h-[50vh]" : "min-h-dvh bg-background",
        )}>
            <div className="mb-2 flex items-center justify-center rounded-full bg-destructive/10 p-4">
                <AlertCircle className={cn("text-destructive", isSection ? "size-8" : "size-10")}/>
            </div>
            <h2 className={cn("font-bold tracking-tight", isSection ? "text-lg" : "text-xl")}>{title}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{description}</p>
            <Button onClick={() => reset()} variant={isSection ? "outline" : "default"} className="mt-4">
                Try again
            </Button>
        </div>
    );
}
