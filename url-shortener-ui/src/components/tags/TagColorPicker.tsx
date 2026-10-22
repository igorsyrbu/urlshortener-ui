import {useId} from "react";
import {RadioGroup} from "radix-ui";
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

/** The text colour of each tag badge variant, so a swatch shows the colour the tag will have. */
const SWATCH_COLOR: Record<string, string> = {
    red: "bg-red-700 dark:bg-red-300",
    yellow: "bg-yellow-700 dark:bg-yellow-300",
    lime: "bg-lime-700 dark:bg-lime-300",
    green: "bg-green-700 dark:bg-green-300",
    blue: "bg-blue-700 dark:bg-blue-300",
    cyan: "bg-cyan-700 dark:bg-cyan-300",
    purple: "bg-purple-700 dark:bg-purple-300",
    gray: "bg-zinc-700 dark:bg-zinc-300",
};

/** A radio group of colour swatches: one tab stop, arrow keys move and select, the checked colour is announced. */
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
                             className="flex flex-wrap gap-1.5 sm:gap-2">
                {ALLOWED_TAG_COLORS.map((color) => (
                    <RadioGroup.Item
                        key={color}
                        value={color}
                        aria-label={capitalize(color)}
                        title={capitalize(color)}
                        className={cn("group cursor-pointer rounded-full p-1 outline-none transition-opacity hover:opacity-80", FOCUS_RING_CLASS)}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "block size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                                "group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-muted-foreground",
                                SWATCH_COLOR[color],
                            )}
                        />
                    </RadioGroup.Item>
                ))}
            </RadioGroup.Root>
        </div>
    );
}
