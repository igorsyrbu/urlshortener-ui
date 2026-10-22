import {useId} from "react";
import {Tag} from "lucide-react";
import {RadioGroup} from "radix-ui";
import {FOCUS_RING_CLASS} from "@/lib/constants";
import {cn} from "@/lib/utils";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";
import {badgeVariants, BadgeVariant} from "@/components/ui/badge";

interface TagColorPickerProps {
    selectedColor: BadgeVariant;
    onChange: (color: BadgeVariant) => void;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

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
                                badgeVariants({variant: color}),
                                "pointer-events-none inline-flex size-7 items-center justify-center rounded-full p-0 ring-offset-2 ring-offset-background transition-shadow",
                                "group-data-[state=checked]:ring-2 group-data-[state=checked]:ring-muted-foreground",
                            )}
                        >
                            <Tag className="size-3.5 shrink-0"/>
                        </span>
                    </RadioGroup.Item>
                ))}
            </RadioGroup.Root>
        </div>
    );
}
