import {LoaderIcon} from "lucide-react";
import {cn} from "@/lib/utils";

interface ButtonSpinnerProps {
    className?: string;
}

export function ButtonSpinner({className}: ButtonSpinnerProps) {
    return (
        <LoaderIcon
            role="status"
            aria-label="Loading"
            className={cn("size-4 animate-spin", className)}
        />
    );
}
