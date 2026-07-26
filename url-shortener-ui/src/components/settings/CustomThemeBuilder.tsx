"use client";

import {useState} from "react";
import {useTheme} from "next-themes";
import {toast} from "sonner";
import {ClipboardCheck, Share2, Sparkles, Upload} from "lucide-react";
import {CustomColorRow} from "@/components/settings/CustomColorRow";
import {ImportThemeDialog} from "@/components/settings/ImportThemeDialog";
import {
    CustomColors,
    DEFAULT_CUSTOM_COLORS,
    parseCustomColorsInput,
    serializeCustomColors,
    surpriseMe,
} from "@/lib/themes/custom-theme";
import {getPresetCustomColors, normalizeCustomColorsToHex} from "@/lib/themes/palettes";
import {PaletteMode} from "@/lib/themes/theme-tokens";
import {usePalette} from "@/providers/palette-provider";
import {COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import {logger} from "@/lib/logger";

interface ColorSlot {
    key: keyof CustomColors;
    label: string;
    description: string;
}

const COLOR_SLOTS: ColorSlot[] = [
    {key: "background", label: "Background", description: "Page canvas behind the cards"},
    {key: "card", label: "Cards", description: "Link, tag, analytics and settings cards"},
    {key: "accent", label: "Accent", description: "Buttons, links, active states, highlights"},
    {key: "destructive", label: "Danger", description: "Delete and error actions"},
];

export function CustomThemeBuilder() {
    const {selection, applyCustomColors} = usePalette();
    const {resolvedTheme} = useTheme();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importValue, setImportValue] = useState("");
    const [hasImportError, setHasImportError] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const mode: PaletteMode = resolvedTheme === "dark" ? "dark" : "light";

    const colors: CustomColors = (() => {
        if (selection.kind === "custom") {
            return selection.colors;
        }
        if (selection.kind === "preset") {
            const presetColors = getPresetCustomColors(selection.paletteId, mode);
            if (presetColors) {
                return normalizeCustomColorsToHex(presetColors);
            }
        }
        return DEFAULT_CUSTOM_COLORS[mode];
    })();

    const handleColorChange = (slot: keyof CustomColors, value: string) => {
        applyCustomColors({...colors, [slot]: value}, mode);
    };

    const handleSurpriseMe = () => {
        applyCustomColors(surpriseMe(mode), mode);
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(serializeCustomColors(colors));
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), COPY_FEEDBACK_DURATION_MS);
        } catch (error) {
            logger.error("Failed to copy theme to clipboard", error);
            toast.error("Failed to copy theme");
        }
    };

    const handleImportOpenChange = (open: boolean) => {
        setIsImportOpen(open);
        if (!open) {
            setImportValue("");
            setHasImportError(false);
        }
    };

    const handleImport = () => {
        const parsed = parseCustomColorsInput(importValue);
        if (!parsed) {
            setHasImportError(true);
            return;
        }
        applyCustomColors(parsed, mode);
        handleImportOpenChange(false);
        toast.success("Theme imported");
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={handleSurpriseMe}
                    className="flex w-24 sm:w-28 flex-col items-center justify-center rounded-xl border-[0.5px] border-border p-3 text-xs font-medium transition-colors hover:bg-muted outline-hidden focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                    <Sparkles className="mb-1.5 size-6 stroke-[1.5]"/>
                    Surprise me
                </button>
                <button
                    type="button"
                    onClick={() => setIsImportOpen(true)}
                    className="flex w-24 sm:w-28 flex-col items-center justify-center rounded-xl border-[0.5px] border-border p-3 text-xs font-medium transition-colors hover:bg-muted outline-hidden focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                    <Upload className="mb-1.5 size-6 stroke-[1.5]"/>
                    Import
                </button>
                <button
                    type="button"
                    onClick={handleShare}
                    className="flex w-24 sm:w-28 flex-col items-center justify-center rounded-xl border-[0.5px] border-border p-3 text-xs font-medium transition-colors hover:bg-muted outline-hidden focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    aria-label={isCopied ? "Theme copied" : "Share theme"}
                >
                    {isCopied ? <ClipboardCheck className="mb-1.5 size-6 stroke-[1.5] text-success"/> :
                        <Share2 className="mb-1.5 size-6 stroke-[1.5]"/>}
                    <span className="min-w-[3.5ch]">{isCopied ? "Copy" : "Share"}</span>
                </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                {COLOR_SLOTS.map((slot) => (
                    <CustomColorRow
                        key={slot.key}
                        label={slot.label}
                        description={slot.description}
                        value={colors[slot.key]}
                        onChange={(value) => handleColorChange(slot.key, value)}
                    />
                ))}
            </div>

            <ImportThemeDialog
                open={isImportOpen}
                onOpenChange={handleImportOpenChange}
                value={importValue}
                onValueChange={(value) => {
                    setImportValue(value);
                    setHasImportError(false);
                }}
                onImport={handleImport}
                hasError={hasImportError}
            />
        </div>
    );
}
