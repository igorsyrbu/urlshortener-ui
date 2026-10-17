import {Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {SESSION_CHECK_COPY} from "@/lib/constants";

interface SessionCheckScreenProps {
    isUnavailable: boolean;
    onRetry: () => void;
}

const SCREEN_CLASS = "h-dvh w-full flex flex-col gap-4 items-center justify-center bg-sidebar text-muted-foreground px-4 text-center";

export function SessionCheckScreen({isUnavailable, onRetry}: SessionCheckScreenProps) {
    if (!isUnavailable) {
        return (
            <div className={SCREEN_CLASS}>
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                <p className="text-sm font-medium">{SESSION_CHECK_COPY.CHECKING}</p>
            </div>
        );
    }

    return (
        <div className={SCREEN_CLASS} role="alert">
            <p className="text-base font-medium text-foreground">{SESSION_CHECK_COPY.UNAVAILABLE_TITLE}</p>
            <p className="max-w-sm text-sm">{SESSION_CHECK_COPY.UNAVAILABLE_DESCRIPTION}</p>
            <Button variant="outline" onClick={onRetry}>{SESSION_CHECK_COPY.RETRY}</Button>
        </div>
    );
}
