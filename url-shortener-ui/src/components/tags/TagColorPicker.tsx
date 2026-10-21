import {useId} from "react";
import {RadioGroup} from "radix-ui";
import {Badge} from "@/components/ui/badge";
import {FOCUS_RING_CLASS} from "@/lib/constants";
import {cn} from "@/lib/utils";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";
import {BadgeVariant} from "@/components/ui/badge";

interface TagColorPickerProps {
    selectedColor: BadgeVariant;
    onChange: (color: BadgeVariant) => void;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const SELECTED_BORDER: Record<string, string> = {
    red: "border-red-700 dark:border-red-300",
    yellow: "border-yellow-700 dark:border-yellow-300",
    lime: "border-lime-700 dark:border-lime-300",
    green: "border-green-700 dark:border-green-300",
    blue: "border-blue-700 dark:border-blue-300",
    cyan: "border-cyan-700 dark:border-cyan-300",
    purple: "border-purple-700 dark:border-purple-300",
    gray: "border-zinc-700 dark:border-zinc-300",
};

/** A radio group: one tab stop, arrow keys move and select, the checked colour is announced. */
export function TagColorPicker({selectedColor, onChange}: TagColorPickerProps) {
    const labelId = useId();

    const handleValueChange = (value: string): void => {
        const color = ALLOWED_TAG_COLORS.find((allowed) => allowed === value);
        if (color) onChange(color);
    };

    return (
        <div className="grid gap-2">
            <span id={labelId} className="text-sm font-medium">Color</span>
            <RadioGroup.Root aria-labelledby={labelId} value={selectedColor} onValueChange={handleValueChange} loop
                             className="flex flex-wrap gap-2">
                {ALLOWED_TAG_COLORS.map((color) => (
                    <RadioGroup.Item
                        key={color}
                        value={color}
                        className={cn("rounded-lg p-1 outline-none transition-all hover:opacity-80", FOCUS_RING_CLASS)}
                    >
                        <Badge
                            variant={color as never}
                            className={`inline-flex items-center rounded-md text-xs font-medium px-2.5 py-1 leading-relaxed whitespace-nowrap shrink-0 select-none cursor-pointer ${
                                selectedColor === color
                                    ? SELECTED_BORDER[color]
                                    : ""
                            }`}
                        >
                            {capitalize(color)}
                        </Badge>
                    </RadioGroup.Item>
                ))}
            </RadioGroup.Root>
        </div>
    );
}
