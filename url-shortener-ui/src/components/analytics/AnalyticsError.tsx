import {Button} from "@/components/ui/button";
import {ANALYTICS_COPY} from "@/lib/constants";
import {cn} from "@/lib/utils";

interface AnalyticsErrorProps {
    message: string;
    onRetry: () => void;
    className?: string;
}

export function AnalyticsError({message, onRetry, className}: AnalyticsErrorProps) {
    return (
        <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>{ANALYTICS_COPY.RETRY}</Button>
        </div>
    );
}
