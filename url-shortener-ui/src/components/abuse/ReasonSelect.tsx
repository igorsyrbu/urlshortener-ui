"use client";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ABUSE_REASON_LABELS, ABUSE_REASONS, type AbuseReason} from "@/lib/constants";

interface ReasonSelectProps {
    value: AbuseReason | "";
    onChange: (value: AbuseReason) => void;
    error?: boolean;
}

export function ReasonSelect({value, onChange, error}: ReasonSelectProps) {
    return (
        <Select
            value={value || undefined}
            onValueChange={(v) => onChange(v as AbuseReason)}
        >
            <SelectTrigger
                className={error ? "border-destructive" : undefined}
                data-error={error ? "true" : undefined}
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
