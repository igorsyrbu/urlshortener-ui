import {converter, formatHex, interpolate, wcagContrast} from "culori";
import {PaletteMode, ThemeTokenMap} from "@/lib/themes/theme-tokens";

export interface CustomColors {
    background: string;
    card: string;
    accent: string;
    destructive: string;
}

export interface CustomThemeDerived {
    light: ThemeTokenMap;
    dark: ThemeTokenMap;
}

const READABLE_LIGHT = "#ffffff";
const READABLE_DARK = "#17171c";
const FALLBACK_DARK = "#000000";
const MIN_TEXT_CONTRAST = 4.5;

const SUCCESS_LIGHT = "#16a34a";
const SUCCESS_DARK = "#22c55e";
const SUCCESS_FOREGROUND = "#ffffff";

const SURFACE_MUTED_MIX = 0.06;
const SURFACE_SECONDARY_ACCENT_MIX = 0.18;
const SURFACE_ACCENT_MIX = 0.32;
const SURFACE_SIDEBAR_ACCENT_MIX = 0.22;
const BORDER_MIX = 0.15;
const MUTED_FOREGROUND_MIX = 0.45;

const DERIVED_DARK_BG_MIN_L = 0.13;
const DERIVED_DARK_BG_MAX_L = 0.25;
const DERIVED_LIGHT_BG_MIN_L = 0.93;
const DERIVED_LIGHT_BG_MAX_L = 0.99;
const DERIVED_DARK_CARD_MIN_L = 0.17;
const DERIVED_DARK_CARD_MAX_L = 0.30;
const DERIVED_LIGHT_CARD_MIN_L = 0.95;
const DERIVED_LIGHT_CARD_MAX_L = 1.0;
const DERIVED_BG_CHROMA_DAMP = 0.6;

const UI_ELEMENT_MIN_CONTRAST = 3.0;
const CONTRAST_NUDGE_STEP = 0.02;
const CONTRAST_NUDGE_MAX_STEPS = 25;

const SURPRISE_BG_LIGHT_L: [number, number] = [0.90, 0.97];
const SURPRISE_BG_DARK_L: [number, number] = [0.15, 0.26];
const SURPRISE_CARD_LIGHT_L: [number, number] = [0.96, 1.0];
const SURPRISE_CARD_DARK_L: [number, number] = [0.19, 0.30];
const SURPRISE_SURFACE_MAX_CHROMA = 0.04;
const SURPRISE_ACCENT_LIGHT_L: [number, number] = [0.45, 0.62];
const SURPRISE_ACCENT_DARK_L: [number, number] = [0.62, 0.8];
const SURPRISE_ACCENT_CHROMA: [number, number] = [0.1, 0.2];
const SURPRISE_DESTRUCTIVE_HUE: [number, number] = [15, 40];
const SURPRISE_DESTRUCTIVE_CHROMA: [number, number] = [0.15, 0.24];
const FULL_HUE_CIRCLE = 360;

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const toOklch = converter("oklch");

export const DEFAULT_CUSTOM_COLORS: Record<PaletteMode, CustomColors> = {
    light: {background: "#f5f4ef", card: "#ffffff", accent: "#d96a47", destructive: "#cc2525"},
    dark: {background: "#121212", card: "#1e1e1e", accent: "#c95d3c", destructive: "#c93336"},
};

export function isValidHex(value: string): boolean {
    return HEX_PATTERN.test(value.trim());
}

export function normalizeHex(value: string): string | null {
    const trimmed = value.trim();
    if (!isValidHex(trimmed)) {
        return null;
    }
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
        return `#${hex.split("").map((char) => char + char).join("")}`.toLowerCase();
    }
    return `#${hex}`.toLowerCase();
}

export function serializeCustomColors(colors: CustomColors): string {
    return [colors.background, colors.card, colors.accent, colors.destructive].join(",");
}

export function parseCustomColorsInput(input: string): CustomColors | null {
    const parts = input.split(",").map((part) => normalizeHex(part));
    if (parts.length !== 4) {
        return null;
    }
    const [background, card, accent, destructive] = parts;
    if (!background || !card || !accent || !destructive) {
        return null;
    }
    return {background, card, accent, destructive};
}

export function readableForeground(background: string): string {
    const lightContrast = wcagContrast(background, READABLE_LIGHT);
    const darkContrast = wcagContrast(background, READABLE_DARK);
    if (Math.max(lightContrast, darkContrast) >= MIN_TEXT_CONTRAST) {
        return lightContrast >= darkContrast ? READABLE_LIGHT : READABLE_DARK;
    }
    // max(#fff, #000) is always >= ~4.58 on any solid color, so this guarantees WCAG AA.
    return wcagContrast(background, FALLBACK_DARK) >= lightContrast ? FALLBACK_DARK : READABLE_LIGHT;
}

function mixColors(from: string, toward: string, amount: number): string {
    const mix = interpolate([from, toward], "oklch");
    return formatHex(mix(amount));
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function ensureUiContrast(color: string, surface: string, mode: PaletteMode): string {
    const oklch = toOklch(color);
    if (oklch === undefined) {
        return color;
    }
    let lightness = oklch.l;
    let candidate = color;
    for (let step = 0; step < CONTRAST_NUDGE_MAX_STEPS; step++) {
        if (wcagContrast(candidate, surface) >= UI_ELEMENT_MIN_CONTRAST) {
            return candidate;
        }
        lightness = mode === "dark" ? lightness + CONTRAST_NUDGE_STEP : lightness - CONTRAST_NUDGE_STEP;
        if (lightness <= 0 || lightness >= 1) {
            return candidate;
        }
        candidate = formatHex({mode: "oklch", l: lightness, c: oklch.c, h: oklch.h});
    }
    return candidate;
}

interface SurfaceRange {
    min: number;
    max: number;
}

const DARK_BG_RANGE: SurfaceRange = {min: DERIVED_DARK_BG_MIN_L, max: DERIVED_DARK_BG_MAX_L};
const LIGHT_BG_RANGE: SurfaceRange = {min: DERIVED_LIGHT_BG_MIN_L, max: DERIVED_LIGHT_BG_MAX_L};
const DARK_CARD_RANGE: SurfaceRange = {min: DERIVED_DARK_CARD_MIN_L, max: DERIVED_DARK_CARD_MAX_L};
const LIGHT_CARD_RANGE: SurfaceRange = {min: DERIVED_LIGHT_CARD_MIN_L, max: DERIVED_LIGHT_CARD_MAX_L};

function deriveOppositeSurface(color: string, authoredMode: PaletteMode, darkRange: SurfaceRange, lightRange: SurfaceRange, fallback: string): string {
    const oklch = toOklch(color);
    if (oklch === undefined) {
        return fallback;
    }
    const inverted = 1 - oklch.l;
    const range = authoredMode === "light" ? darkRange : lightRange;
    return formatHex({
        mode: "oklch",
        l: clamp(inverted, range.min, range.max),
        c: (oklch.c ?? 0) * DERIVED_BG_CHROMA_DAMP,
        h: oklch.h,
    });
}

interface VariantSurfaces {
    background: string;
    card: string;
    accent: string;
    destructive: string;
}

function buildVariant(mode: PaletteMode, surfaces: VariantSurfaces): ThemeTokenMap {
    const {background, card, accent, destructive} = surfaces;
    const foreground = readableForeground(card);
    const sidebarForeground = readableForeground(background);
    const muted = mixColors(card, foreground, SURFACE_MUTED_MIX);
    const secondary = mixColors(card, accent, SURFACE_SECONDARY_ACCENT_MIX);
    const accentSurface = mixColors(card, accent, SURFACE_ACCENT_MIX);
    const border = mixColors(card, foreground, BORDER_MIX);
    const mutedForeground = mixColors(foreground, card, MUTED_FOREGROUND_MIX);
    const accentForeground = readableForeground(accent);
    const success = mode === "light" ? SUCCESS_LIGHT : SUCCESS_DARK;

    return {
        background,
        foreground,
        card,
        cardForeground: foreground,
        popover: card,
        popoverForeground: foreground,
        primary: accent,
        primaryForeground: accentForeground,
        secondary,
        secondaryForeground: foreground,
        muted,
        mutedForeground,
        accent: accentSurface,
        accentForeground: foreground,
        destructive,
        destructiveForeground: readableForeground(destructive),
        success,
        successForeground: SUCCESS_FOREGROUND,
        border,
        input: border,
        ring: accent,
        sidebar: background,
        sidebarForeground,
        sidebarPrimary: accent,
        sidebarPrimaryForeground: accentForeground,
        sidebarAccent: mixColors(background, accent, SURFACE_SIDEBAR_ACCENT_MIX),
        sidebarAccentForeground: sidebarForeground,
        sidebarBorder: mixColors(background, sidebarForeground, BORDER_MIX),
        sidebarRing: accent,
        chartClicks: accent,
    };
}

export function buildCustomTheme(colors: CustomColors, authoredMode: PaletteMode): CustomThemeDerived {
    const oppositeMode: PaletteMode = authoredMode === "light" ? "dark" : "light";
    const derivedBackground = deriveOppositeSurface(
        colors.background,
        authoredMode,
        DARK_BG_RANGE,
        LIGHT_BG_RANGE,
        oppositeMode === "dark" ? "#1e1e1e" : "#ffffff"
    );
    const derivedCard = deriveOppositeSurface(
        colors.card,
        authoredMode,
        DARK_CARD_RANGE,
        LIGHT_CARD_RANGE,
        derivedBackground
    );
    const derivedSurfaces: VariantSurfaces = {
        background: derivedBackground,
        card: derivedCard,
        accent: ensureUiContrast(colors.accent, derivedCard, oppositeMode),
        destructive: ensureUiContrast(colors.destructive, derivedCard, oppositeMode),
    };

    const authoredVariant = buildVariant(authoredMode, colors);
    const derivedVariant = buildVariant(oppositeMode, derivedSurfaces);

    return authoredMode === "light"
        ? {light: authoredVariant, dark: derivedVariant}
        : {light: derivedVariant, dark: authoredVariant};
}

function randomInRange([min, max]: [number, number]): number {
    return min + Math.random() * (max - min);
}

function randomOklchHex(lRange: [number, number], cRange: [number, number], hue: number): string {
    return formatHex({
        mode: "oklch",
        l: randomInRange(lRange),
        c: randomInRange(cRange),
        h: ((hue % FULL_HUE_CIRCLE) + FULL_HUE_CIRCLE) % FULL_HUE_CIRCLE,
    });
}

export function surpriseMe(mode: PaletteMode): CustomColors {
    const backgroundLRange = mode === "light" ? SURPRISE_BG_LIGHT_L : SURPRISE_BG_DARK_L;
    const cardLRange = mode === "light" ? SURPRISE_CARD_LIGHT_L : SURPRISE_CARD_DARK_L;
    const accentLRange = mode === "light" ? SURPRISE_ACCENT_LIGHT_L : SURPRISE_ACCENT_DARK_L;
    const accentHue = Math.random() * FULL_HUE_CIRCLE;

    return {
        background: randomOklchHex(backgroundLRange, [0, SURPRISE_SURFACE_MAX_CHROMA], Math.random() * FULL_HUE_CIRCLE),
        card: randomOklchHex(cardLRange, [0, SURPRISE_SURFACE_MAX_CHROMA], Math.random() * FULL_HUE_CIRCLE),
        accent: randomOklchHex(accentLRange, SURPRISE_ACCENT_CHROMA, accentHue),
        destructive: randomOklchHex(accentLRange, SURPRISE_DESTRUCTIVE_CHROMA, randomInRange(SURPRISE_DESTRUCTIVE_HUE)),
    };
}
