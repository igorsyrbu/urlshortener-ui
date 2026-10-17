import type {ReactNode} from "react";
import {cn} from "@/lib/utils";

interface FieldErrorProps {
    /** Referenced by the field's `aria-describedby`, so screen readers read the error with the field. */
    id: string;
    children: ReactNode;
    className?: string;
}

/** Validation message for one form field; `role="alert"` announces it as soon as it appears. */
export function FieldError({id, children, className}: FieldErrorProps) {
    return (
        <p id={id} role="alert" className={cn("text-sm text-destructive break-words", className)}>
            {children}
        </p>
    );
}
