"use client";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ABUSE_REASON_LABELS, ABUSE_REASONS, type AbuseReason} from "@/lib/constants";

interface ReasonSelectProps {
    id: string;
    value: AbuseReason | "";
    onChange: (value: AbuseReason) => void;
    error?: boolean;
    /** Id of the element describing the current error, if any. */
    errorId?: string;
}

export function ReasonSelect({id, value, onChange, error, errorId}: ReasonSelectProps) {
    return (
        <Select
            value={value || undefined}
            onValueChange={(v) => onChange(v as AbuseReason)}
        >
            <SelectTrigger
                id={id}
                className={error ? "border-destructive" : undefined}
                data-error={error ? "true" : undefined}
                aria-invalid={error || undefined}
                aria-describedby={error ? errorId : undefined}
            >
                <SelectValue placeholder="Select a reason"/>
            </SelectTrigger>
            <SelectContent>
                {ABUSE_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                        {ABUSE_REASON_LABELS[reason]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
