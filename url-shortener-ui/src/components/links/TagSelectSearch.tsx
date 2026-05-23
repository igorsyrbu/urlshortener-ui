"use client";

import React from "react";
import {Input} from "@/components/ui/input";

interface TagSelectSearchProps {
    value: string;
    onChange: (value: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

export function TagSelectSearch({value, onChange, inputRef}: TagSelectSearchProps) {
    return (
        <div className="p-2 pb-0">
            <Input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search or add tags..."
                className="w-full"
            />
        </div>
    );
}
