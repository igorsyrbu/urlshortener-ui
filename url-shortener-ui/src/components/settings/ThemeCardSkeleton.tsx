"use client";

import {Card, CardContent} from "@/components/ui/card";
import {PALETTE_GRID_CLASS} from "@/components/settings/PresetPaletteGrid";
import {PALETTES} from "@/lib/themes/palettes";
import {ThemeCardHeading} from "@/components/settings/ThemeCardHeading";

const SWATCH_DOT_COUNT = 4;

/** Shown until the stored theme is known; one tile per palette, so the card keeps its final height. */
export function ThemeCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading color theme">
            <CardContent className="@container flex flex-col gap-4" aria-hidden="true">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <ThemeCardHeading/>
                    <div className="h-12 w-full rounded-xl bg-muted animate-pulse sm:w-40"/>
                </div>
                <div className={PALETTE_GRID_CLASS}>
                    {PALETTES.map((palette) => (
                        <div key={palette.id}
                             className="flex flex-col items-center justify-center rounded-xl border-[0.5px] border-border p-3">
                            <div className="mb-2 flex gap-1.5">
                                {Array.from({length: SWATCH_DOT_COUNT}, (_, dot) => (
                                    <span key={dot} className="size-4 rounded-full bg-muted animate-pulse"/>
                                ))}
                            </div>
                            <span className="text-xs font-medium sm:text-sm">{palette.name}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
