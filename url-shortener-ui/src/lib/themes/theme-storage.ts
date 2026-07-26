import {THEME_PALETTE_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {CustomColors, CustomThemeDerived, isValidHex} from "@/lib/themes/custom-theme";
import {isKnownPaletteId} from "@/lib/themes/palettes";
import {PaletteMode, ThemeTokenMap, TOKEN_CSS_VAR_NAMES} from "@/lib/themes/theme-tokens";

const THEME_SELECTION_VERSION = 2;

export interface PresetThemeSelection {
    v: number;
    kind: "preset";
    paletteId: string;
}

export interface CustomThemeSelection {
    v: number;
    kind: "custom";
    colors: CustomColors;
    authoredMode: PaletteMode;
    derived: CustomThemeDerived;
}

export type ThemeSelection = PresetThemeSelection | CustomThemeSelection;

export const DEFAULT_THEME_SELECTION: PresetThemeSelection = {
    v: THEME_SELECTION_VERSION,
    kind: "preset",
    paletteId: "default",
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isTokenMap(value: unknown): value is ThemeTokenMap {
    if (!isRecord(value)) {
        return false;
    }
    return Object.keys(TOKEN_CSS_VAR_NAMES).every((key) => typeof value[key] === "string");
}

function isHexColor(value: unknown): value is string {
    return typeof value === "string" && isValidHex(value);
}

function parseCustomColors(value: unknown): CustomColors | null {
    if (!isRecord(value)) {
        return null;
    }
    const {background, card, accent, destructive} = value;
    if (!isHexColor(background) || !isHexColor(card) || !isHexColor(accent) || !isHexColor(destructive)) {
        return null;
    }
    return {background, card, accent, destructive};
}

function parseSelection(value: unknown): ThemeSelection | null {
    if (!isRecord(value) || value.v !== THEME_SELECTION_VERSION) {
        return null;
    }
    if (value.kind === "preset" && typeof value.paletteId === "string" && isKnownPaletteId(value.paletteId)) {
        return {v: THEME_SELECTION_VERSION, kind: "preset", paletteId: value.paletteId};
    }
    if (value.kind === "custom") {
        const colors = parseCustomColors(value.colors);
        const authoredMode = value.authoredMode === "dark" ? "dark" : value.authoredMode === "light" ? "light" : null;
        const derived = isRecord(value.derived) ? value.derived : null;
        if (!colors || !authoredMode || !derived || !isTokenMap(derived.light) || !isTokenMap(derived.dark)) {
            return null;
        }
        return {v: THEME_SELECTION_VERSION, kind: "custom", colors, authoredMode, derived: {light: derived.light, dark: derived.dark}};
    }
    return null;
}

export function getThemeSelection(): ThemeSelection | null {
    try {
        const raw = localStorage.getItem(THEME_PALETTE_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return parseSelection(JSON.parse(raw));
    } catch (error) {
        logger.error("Failed to load theme selection from localStorage", error);
        return null;
    }
}

export function setThemeSelection(selection: ThemeSelection): void {
    try {
        localStorage.setItem(THEME_PALETTE_STORAGE_KEY, JSON.stringify(selection));
    } catch (error) {
        logger.error("Failed to save theme selection to localStorage", error);
    }
}

export function clearThemeSelection(): void {
    try {
        localStorage.removeItem(THEME_PALETTE_STORAGE_KEY);
    } catch (error) {
        logger.error("Failed to clear theme selection from localStorage", error);
    }
}

export function subscribeThemeSelection(callback: () => void): () => void {
    const handleStorage = (event: StorageEvent) => {
        if (event.key === THEME_PALETTE_STORAGE_KEY) {
            callback();
        }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
}
