"use client";

import {useState} from "react";
import {HexColorPicker} from "react-colorful";
import {Input} from "@/components/ui/input";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {isValidHex, normalizeHex} from "@/lib/themes/custom-theme";

interface CustomColorRowProps {
    label: string;
    description: string;
    value: string;
    onChange: (value: string) => void;
}

interface Draft {
    base: string;
    text: string;
}

export function CustomColorRow({label, description, value, onChange}: CustomColorRowProps) {
    const [draft, setDraft] = useState<Draft | null>(null);
    const [open, setOpen] = useState(false);

    const text = draft !== null && draft.base === value ? draft.text : value;

    const handleTextChange = (nextText: string) => {
        const trimmed = nextText.trim();
        setDraft({base: value, text: nextText});
        if (trimmed.length === 7) {
            const normalized = normalizeHex(trimmed);
            if (normalized) {
                onChange(normalized);
            }
        }
    };

    const applyDraft = () => {
        const normalized = normalizeHex(text);
        if (normalized) {
            onChange(normalized);
        }
        setDraft(null);
    };

    const handleTextBlur = () => {
        applyDraft();
    };

    const handleTextKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyDraft();
        }
    };

    const handlePickerChange = (nextValue: string) => {
        setDraft(null);
        onChange(nextValue);
    };

    return (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-xl border-[0.5px] border-border p-2.5 sm:gap-3 sm:p-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="relative size-8 shrink-0 cursor-pointer rounded-full border border-border"
                        style={{backgroundColor: value}}
                        aria-label={`Pick ${label} color`}
                    />
                </PopoverTrigger>
                <PopoverContent className="w-[260px] rounded-2xl p-3" align="start" sideOffset={8}>
                    <div className="flex flex-col gap-2">
                        <HexColorPicker
                            color={value}
                            onChange={handlePickerChange}
                            style={{width: "100%", height: "240px"}}
                        />
                        <Input
                            value={text}
                            onChange={(event) => handleTextChange(event.target.value)}
                            onBlur={handleTextBlur}
                            onKeyDown={handleTextKeyDown}
                            aria-invalid={!isValidHex(text)}
                            aria-label={`${label} hex value`}
                            className="w-full rounded-xl border-[0.5px] text-center uppercase font-mono"
                            spellCheck={false}
                        />
                    </div>
                </PopoverContent>
            </Popover>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
