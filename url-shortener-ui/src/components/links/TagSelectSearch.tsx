"use client";

import React from "react";
import {Input} from "@/components/ui/input";

interface TagSelectSearchProps {
    value: string;
    onChange: (value: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    listboxId: string;
    activeOptionId: string | undefined;
}

/** The combobox of the tag picker: focus stays here while the arrow keys move the active option in the listbox. */
export function TagSelectSearch({value, onChange, inputRef, listboxId, activeOptionId}: TagSelectSearchProps) {
    return (
        <div className="p-2 pb-0">
            <Input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label="Search or add tags"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeOptionId}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search or add tags..."
                className="w-full"
            />
        </div>
    );
}
