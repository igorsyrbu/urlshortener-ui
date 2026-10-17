import {Button} from "@/components/ui/button";
import {TRY_AGAIN_LABEL} from "@/lib/constants";
import {cn} from "@/lib/utils";

interface ErrorWithRetryProps {
    message: string;
    onRetry: () => void;
    className?: string;
}

/** A load failure in place of the content it could not load, with a way to try again (never an empty state). */
export function ErrorWithRetry({message, onRetry, className}: ErrorWithRetryProps) {
    return (
        <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>{TRY_AGAIN_LABEL}</Button>
        </div>
    );
}
