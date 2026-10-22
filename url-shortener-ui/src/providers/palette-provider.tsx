"use client";

import * as React from "react";
import {useTheme} from "next-themes";
import type {CustomColors, CustomThemeDerived} from "@/lib/themes/custom-theme";
import {CUSTOM_PALETTE_ID, DEFAULT_PALETTE_ID} from "@/lib/themes/palettes";
import {
    clearThemeSelection,
    DEFAULT_THEME_SELECTION,
    getThemeSelection,
    setThemeSelection,
    subscribeThemeSelection,
    ThemeSelection,
} from "@/lib/themes/theme-storage";
import {PaletteMode, ThemeTokenMap, TOKEN_CSS_VAR_NAMES, TOKEN_ENTRIES} from "@/lib/themes/theme-tokens";

interface PaletteContextValue {
    selection: ThemeSelection;
    activePaletteId: string;
    selectPreset: (paletteId: string) => void;
    /** `derived` comes from `buildCustomTheme`; the caller builds it so the colour library stays out of the root layout. */
    applyCustomColors: (colors: CustomColors, authoredMode: PaletteMode, derived: CustomThemeDerived) => void;
    /** Shows the colours like `applyCustomColors` but does not save them, for changes that arrive every frame. */
    previewCustomColors: (colors: CustomColors, authoredMode: PaletteMode, derived: CustomThemeDerived) => void;
    resetToDefault: () => void;
}

const PaletteContext = React.createContext<PaletteContextValue | null>(null);

function clearInlineTokens(root: HTMLElement): void {
    for (const [, cssVar] of TOKEN_ENTRIES) {
        root.style.removeProperty(cssVar);
    }
}

function applyInlineTokens(root: HTMLElement, tokens: ThemeTokenMap): void {
    for (const [key, cssVar] of TOKEN_ENTRIES) {
        root.style.setProperty(cssVar, tokens[key]);
    }
}

function updateThemeColorMeta(mode: PaletteMode): void {
    const background = getComputedStyle(document.documentElement).getPropertyValue(TOKEN_CSS_VAR_NAMES.background).trim();
    if (!background) {
        return;
    }
    document
        .querySelector(`meta[name="theme-color"][media*="prefers-color-scheme: ${mode}"]`)
        ?.setAttribute("content", background);
}

function readInitialSelection(): ThemeSelection {
    if (typeof window === "undefined") {
        return DEFAULT_THEME_SELECTION;
    }
    return getThemeSelection() ?? DEFAULT_THEME_SELECTION;
}

export function PaletteProvider({children}: { children: React.ReactNode }) {
    const {resolvedTheme} = useTheme();
    const [selection, setSelection] = React.useState<ThemeSelection>(readInitialSelection);

    const mode: PaletteMode = resolvedTheme === "dark" ? "dark" : "light";

    React.useEffect(() => {
        return subscribeThemeSelection(() => {
            setSelection(getThemeSelection() ?? DEFAULT_THEME_SELECTION);
        });
    }, []);

    // A layout effect: the palette must reach <html> before the browser paints, or one frame shows the new content in
    // the old colours.
    React.useLayoutEffect(() => {
        const root = document.documentElement;
        if (selection.kind === "preset") {
            clearInlineTokens(root);
            if (selection.paletteId === DEFAULT_PALETTE_ID) {
                root.removeAttribute("data-palette");
            } else {
                root.setAttribute("data-palette", selection.paletteId);
            }
        } else {
            root.removeAttribute("data-palette");
            applyInlineTokens(root, mode === "dark" ? selection.derived.dark : selection.derived.light);
        }
        updateThemeColorMeta(mode);
    }, [selection, mode]);

    const selectPreset = React.useCallback((paletteId: string) => {
        const next: ThemeSelection = {v: DEFAULT_THEME_SELECTION.v, kind: "preset", paletteId};
        setThemeSelection(next);
        setSelection(next);
    }, []);

    const applyCustomColors = React.useCallback((colors: CustomColors, authoredMode: PaletteMode, derived: CustomThemeDerived) => {
        const next: ThemeSelection = {v: DEFAULT_THEME_SELECTION.v, kind: "custom", colors, authoredMode, derived};
        setThemeSelection(next);
        setSelection(next);
    }, []);

    const previewCustomColors = React.useCallback((colors: CustomColors, authoredMode: PaletteMode, derived: CustomThemeDerived) => {
        setSelection({v: DEFAULT_THEME_SELECTION.v, kind: "custom", colors, authoredMode, derived});
    }, []);

    const resetToDefault = React.useCallback(() => {
        clearThemeSelection();
        setSelection(DEFAULT_THEME_SELECTION);
    }, []);

    const value = React.useMemo<PaletteContextValue>(() => ({
        selection,
        activePaletteId: selection.kind === "custom" ? CUSTOM_PALETTE_ID : selection.paletteId,
        selectPreset,
        applyCustomColors,
        previewCustomColors,
        resetToDefault,
    }), [selection, selectPreset, applyCustomColors, previewCustomColors, resetToDefault]);

    return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteContextValue {
    const context = React.useContext(PaletteContext);
    if (!context) {
        throw new Error("usePalette must be used within PaletteProvider");
    }
    return context;
}
