"use client";

import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

interface CreateLinkUrlFieldProps {
    inputId: string;
    value: string;
    urlError: string | null;
    onChange: (value: string) => void;
    onBlur: () => void;
}

export function CreateLinkUrlField({inputId, value, urlError, onChange, onBlur}: CreateLinkUrlFieldProps) {
    return (
        <div className="grid gap-2">
            <label htmlFor={inputId} className="text-sm font-medium">
                Destination URL
            </label>
            <div className="flex gap-2">
                <Input
                    id={inputId}
                    placeholder="https://example.com/long-url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    className={cn(
                        "col-span-3",
                        urlError && "border-destructive focus-visible:border-destructive",
                    )}
                    required
                />
            </div>
            {urlError ? <p className="-mt-1 text-xs text-destructive">{urlError}</p> : null}
        </div>
    );
}
