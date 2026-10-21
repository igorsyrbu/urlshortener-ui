"use client";

import {useHasMounted} from "@/lib/hooks/useHasMounted";
import {useTheme} from "next-themes";
import {PALETTES, PaletteSwatch} from "@/lib/themes/palettes";
import {usePalette} from "@/providers/palette-provider";
import {cn} from "@/lib/utils";

/** Columns follow the card's width (a container set by `ThemeCard`), which is narrower than the viewport next to the section title. */
export const PALETTE_GRID_CLASS = "grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4";

function SwatchDots({swatch}: { swatch: PaletteSwatch }) {
    const colors = [swatch.background, swatch.primary, swatch.accent, swatch.foreground];
    return (
        <div className="mb-2 flex gap-1.5">
            {colors.map((color, index) => (
                <span
                    key={index}
                    className="size-4 rounded-full border border-black/10 dark:border-white/10"
                    style={{backgroundColor: color}}
                />
            ))}
        </div>
    );
}

export function PresetPaletteGrid() {
    const {activePaletteId, selectPreset} = usePalette();
    const {resolvedTheme} = useTheme();
    const mounted = useHasMounted();

    const mode = mounted && resolvedTheme === "dark" ? "dark" : "light";

    return (
        <div className={PALETTE_GRID_CLASS}>
            {PALETTES.map((palette) => {
                const isSelected = mounted && activePaletteId === palette.id;
                return (
                    <button
                        key={palette.id}
                        onClick={() => selectPreset(palette.id)}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-xl border-[0.5px] p-3 transition-colors outline-hidden hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            isSelected ? "border-primary ring-1 ring-primary" : "border-border"
                        )}
                    >
                        <SwatchDots swatch={palette.swatch[mode]}/>
                        <span className="text-xs font-medium sm:text-sm">{palette.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
