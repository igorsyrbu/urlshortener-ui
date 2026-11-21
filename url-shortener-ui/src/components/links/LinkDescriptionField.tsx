"use client";

import {Textarea} from "@/components/ui/textarea";
import {LINK_DESCRIPTION_COPY, LINK_DESCRIPTION_MAX_LENGTH} from "@/lib/constants";

interface LinkDescriptionFieldProps {
    inputId: string;
    value: string;
    onChange: (value: string) => void;
}

/**
 * An optional note on what the link is for. Typing and pasting stop at the backend's limit; the limit is only
 * mentioned once the text reaches it.
 */
export function LinkDescriptionField({inputId, value, onChange}: LinkDescriptionFieldProps) {
    const limitId = `${inputId}-limit`;
    const isAtLimit = value.length >= LINK_DESCRIPTION_MAX_LENGTH;

    return (
        <div className="grid gap-2">
            <label htmlFor={inputId} className="text-sm font-medium">{LINK_DESCRIPTION_COPY.LABEL}</label>
            <Textarea
                id={inputId}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={LINK_DESCRIPTION_COPY.PLACEHOLDER}
                maxLength={LINK_DESCRIPTION_MAX_LENGTH}
                rows={3}
                aria-describedby={isAtLimit ? limitId : undefined}
                className="resize-none"
            />
            {isAtLimit && (
                <p id={limitId} aria-live="polite" className="text-xs text-muted-foreground">
                    {LINK_DESCRIPTION_COPY.LIMIT_REACHED}
                </p>
            )}
        </div>
    );
}
