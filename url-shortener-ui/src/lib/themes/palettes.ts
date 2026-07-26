import {formatHex} from "culori";
import {PaletteMode} from "@/lib/themes/theme-tokens";

export const DEFAULT_PALETTE_ID = "default";
export const CUSTOM_PALETTE_ID = "custom";

export interface PaletteSwatch {
    background: string;
    primary: string;
    accent: string;
    foreground: string;
}

export interface PaletteCustomColors {
    background: string;
    card: string;
    primary: string;
    destructive: string;
}

export interface PaletteMeta {
    id: string;
    name: string;
    swatch: Record<PaletteMode, PaletteSwatch>;
    customColors: Record<PaletteMode, PaletteCustomColors>;
}

export const PALETTES: PaletteMeta[] = [
    {
        id: "ayu",
        name: "Ayu",
        swatch: {
            light: {background: "#FAFAFA", primary: "#FA8D3E", accent: "#E7E8E6", foreground: "#5C6166"},
            dark: {background: "#0B0E14", primary: "#FFB454", accent: "#1B2733", foreground: "#BFBDB6"},
        },
        customColors: {
            light: {background: "#FAFAFA", card: "#FAFAFA", primary: "#FA8D3E", destructive: "#E65050"},
            dark: {background: "#0B0E14", card: "#0D1017", primary: "#FFB454", destructive: "#F07178"},
        },
    },
    {
        id: "catppuccin",
        name: "Catppuccin",
        swatch: {
            light: {background: "#EFF1F5", primary: "#8839EF", accent: "#BCC0CC", foreground: "#4C4F69"},
            dark: {background: "#1E1E2E", primary: "#CBA6F7", accent: "#45475A", foreground: "#CDD6F4"},
        },
        customColors: {
            light: {background: "#EFF1F5", card: "#EFF1F5", primary: "#8839EF", destructive: "#D20F39"},
            dark: {background: "#1E1E2E", card: "#1E1E2E", primary: "#CBA6F7", destructive: "#F38BA8"},
        },
    },
    {
        id: "forest",
        name: "Forest",
        swatch: {
            light: {background: "oklch(0.9711 0.0074 80.7211)", primary: "oklch(0.5234 0.1347 144.1672)", accent: "oklch(0.8952 0.0504 146.0366)", foreground: "oklch(0.3000 0.0358 30.2042)"},
            dark: {background: "oklch(0.2200 0.0150 160)", primary: "oklch(0.6200 0.1600 145)", accent: "oklch(0.3900 0.0500 150)", foreground: "oklch(0.9300 0.0100 150)"},
        },
        customColors: {
            light: {
                background: "oklch(0.9711 0.0074 80.7211)",
                card: "oklch(0.9711 0.0074 80.7211)",
                primary: "oklch(0.5234 0.1347 144.1672)",
                destructive: "oklch(0.5386 0.1937 26.7249)",
            },
            dark: {
                background: "oklch(0.2200 0.0150 160)",
                card: "oklch(0.2200 0.0150 160)",
                primary: "oklch(0.6200 0.1600 145)",
                destructive: "oklch(0.6500 0.2000 25)",
            },
        },
    },
    {
        id: "mono",
        name: "Mono",
        swatch: {
            light: {background: "oklch(0.9900 0 0)", primary: "oklch(0 0 0)", accent: "oklch(0.9400 0 0)", foreground: "oklch(0 0 0)"},
            dark: {background: "oklch(0.2000 0 0)", primary: "oklch(1 0 0)", accent: "oklch(0.3200 0 0)", foreground: "oklch(1 0 0)"},
        },
        customColors: {
            light: {
                background: "oklch(0.9900 0 0)",
                card: "oklch(1 0 0)",
                primary: "oklch(0 0 0)",
                destructive: "oklch(0.6300 0.1900 23.0300)",
            },
            dark: {
                background: "oklch(0.2000 0 0)",
                card: "oklch(0.2000 0 0)",
                primary: "oklch(1 0 0)",
                destructive: "oklch(0.6900 0.2000 23.9100)",
            },
        },
    },
    {
        id: "one-dark",
        name: "One Dark",
        swatch: {
            light: {background: "#FAFAFA", primary: "#4078F2", accent: "#E5E5E6", foreground: "#383A42"},
            dark: {background: "#282C34", primary: "#61AFEF", accent: "#3B4048", foreground: "#ABB2BF"},
        },
        customColors: {
            light: {background: "#FAFAFA", card: "#FFFFFF", primary: "#4078F2", destructive: "#E45649"},
            dark: {background: "#282C34", card: "#282C34", primary: "#61AFEF", destructive: "#E06C75"},
        },
    },
    {
        id: DEFAULT_PALETTE_ID,
        name: "Terracotta",
        swatch: {
            light: {background: "#ffffff", primary: "#d96a47", accent: "#f5f4ef", foreground: "#2d2b28"},
            dark: {background: "#1e1e1e", primary: "#c95d3c", accent: "#3b3a36", foreground: "#eae6df"},
        },
        customColors: {
            light: {background: "#f5f4ef", card: "#ffffff", primary: "#d96a47", destructive: "#cc2525"},
            dark: {background: "#121212", card: "#1e1e1e", primary: "#c95d3c", destructive: "#c93336"},
        },
    },
    {
        id: "tokyo-night",
        name: "Tokyo Night",
        swatch: {
            light: {background: "#E1E2E7", primary: "#3760BF", accent: "#C9CBD3", foreground: "#343B58"},
            dark: {background: "#1A1B26", primary: "#7AA2F7", accent: "#292E42", foreground: "#C0CAF5"},
        },
        customColors: {
            light: {background: "#E1E2E7", card: "#E1E2E7", primary: "#3760BF", destructive: "#C64350"},
            dark: {background: "#1A1B26", card: "#1A1B26", primary: "#7AA2F7", destructive: "#F7768E"},
        },
    },
    {
        id: "zen",
        name: "Zen",
        swatch: {
            light: {background: "oklch(0.9195 0.0169 88.0030)", primary: "oklch(0.3012 0 0)", accent: "oklch(0.9169 0.0175 99.6160)", foreground: "oklch(0.2350 0 0)"},
            dark: {background: "oklch(0.1913 0 0)", primary: "oklch(0.8520 0.0205 100.6306)", accent: "oklch(0.3329 0 0)", foreground: "oklch(0.9173 0.0133 82.4015)"},
        },
        customColors: {
            light: {
                background: "oklch(0.9195 0.0169 88.0030)",
                card: "oklch(0.9530 0.0156 86.4257)",
                primary: "oklch(0.3012 0 0)",
                destructive: "oklch(0.5771 0.2152 27.3250)",
            },
            dark: {
                background: "oklch(0.1913 0 0)",
                card: "oklch(0.2264 0 0)",
                primary: "oklch(0.8520 0.0205 100.6306)",
                destructive: "oklch(0.6368 0.2078 25.3313)",
            },
        },
    },
];

export function isKnownPaletteId(paletteId: string): boolean {
    return PALETTES.some((palette) => palette.id === paletteId);
}

export function getPresetCustomColors(paletteId: string, mode: PaletteMode): PaletteCustomColors | null {
    const palette = PALETTES.find((p) => p.id === paletteId);
    if (!palette) {
        return null;
    }
    return palette.customColors[mode];
}

export function normalizeCustomColorsToHex(colors: PaletteCustomColors): {background: string; card: string; accent: string; destructive: string} {
    return {
        background: formatHex(colors.background) ?? colors.background,
        card: formatHex(colors.card) ?? colors.card,
        accent: formatHex(colors.primary) ?? colors.primary,
        destructive: formatHex(colors.destructive) ?? colors.destructive,
    };
}
