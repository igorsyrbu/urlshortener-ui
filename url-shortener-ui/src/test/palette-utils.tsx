import type {ReactNode} from "react";
import {render, type RenderResult} from "@testing-library/react";
import {buildCustomTheme, type CustomColors} from "@/lib/themes/custom-theme";
import {getThemeSelection, setThemeSelection, type ThemeSelection} from "@/lib/themes/theme-storage";
import {TOKEN_ENTRIES} from "@/lib/themes/theme-tokens";
import {resetResolvedTheme} from "@/test/next-themes-utils";
import {PaletteProvider} from "@/providers/palette-provider";

export function renderWithPalette(ui: ReactNode): RenderResult {
    return render(<PaletteProvider>{ui}</PaletteProvider>);
}

export function storeCustomTheme(colors: CustomColors, authoredMode: "light" | "dark" = "light"): void {
    setThemeSelection({v: 2, kind: "custom", colors, authoredMode, derived: buildCustomTheme(colors, authoredMode)});
}

export function readStoredSelection(): ThemeSelection | null {
    return getThemeSelection();
}

export function resetDocumentTheme(): void {
    const root = document.documentElement;
    root.removeAttribute("data-palette");
    for (const [, cssVar] of TOKEN_ENTRIES) {
        root.style.removeProperty(cssVar);
    }
    resetResolvedTheme();
}

