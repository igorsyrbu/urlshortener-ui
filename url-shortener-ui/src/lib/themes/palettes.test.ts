import {describe, expect, it} from "vitest";
import {
    CUSTOM_PALETTE_ID,
    DEFAULT_PALETTE_ID,
    getPresetCustomColors,
    isKnownPaletteId,
    normalizeCustomColorsToHex,
    PALETTES,
} from "@/lib/themes/palettes";

const HEX_COLOR = /^#[0-9a-f]{6}$/;

describe("PALETTES", () => {
    it("has unique ids", () => {
        const ids = PALETTES.map((palette) => palette.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it("includes the default palette but not the custom one", () => {
        const ids = PALETTES.map((palette) => palette.id);

        expect(ids).toContain(DEFAULT_PALETTE_ID);
        expect(ids).not.toContain(CUSTOM_PALETTE_ID);
    });

    it.each(PALETTES.map((palette) => [palette.id, palette] as const))("%s provides swatches and custom colors for both modes", (_id, palette) => {
        for (const mode of ["light", "dark"] as const) {
            expect(Object.values(palette.swatch[mode]).every(Boolean)).toBe(true);
            expect(Object.values(palette.customColors[mode]).every(Boolean)).toBe(true);
        }
    });
});

describe("isKnownPaletteId", () => {
    it.each(PALETTES.map((palette) => palette.id))("knows %s", (id) => {
        expect(isKnownPaletteId(id)).toBe(true);
    });

    it.each([CUSTOM_PALETTE_ID, "", "Ayu", "missing"])("does not know %j", (id) => {
        expect(isKnownPaletteId(id)).toBe(false);
    });
});

describe("getPresetCustomColors", () => {
    it("returns the colors of a preset for the requested mode", () => {
        expect(getPresetCustomColors("ayu", "dark")).toEqual({
            background: "#0B0E14", card: "#0D1017", primary: "#FFB454", destructive: "#F07178",
        });
    });

    it("returns different colors for light and dark", () => {
        expect(getPresetCustomColors("catppuccin", "light")).not.toEqual(getPresetCustomColors("catppuccin", "dark"));
    });

    it("returns null for an unknown palette", () => {
        expect(getPresetCustomColors("missing", "light")).toBeNull();
    });
});

describe("normalizeCustomColorsToHex", () => {
    it("converts oklch colors to hex and renames primary to accent", () => {
        const colors = getPresetCustomColors("mono", "light");
        if (!colors) throw new Error("mono palette is missing");

        const normalized = normalizeCustomColorsToHex(colors);

        expect(Object.keys(normalized).sort()).toEqual(["accent", "background", "card", "destructive"]);
        expect(Object.values(normalized).every((value) => HEX_COLOR.test(value))).toBe(true);
        expect(normalized.accent).toBe("#000000");
    });

    it("keeps hex colors equivalent while lower-casing them", () => {
        const normalized = normalizeCustomColorsToHex({background: "#FAFAFA", card: "#FFFFFF", primary: "#FA8D3E", destructive: "#E65050"});

        expect(normalized).toEqual({background: "#fafafa", card: "#ffffff", accent: "#fa8d3e", destructive: "#e65050"});
    });

    it("keeps a value it cannot parse instead of dropping it", () => {
        const normalized = normalizeCustomColorsToHex({background: "not-a-color", card: "#fff", primary: "#000", destructive: "#f00"});

        expect(normalized.background).toBe("not-a-color");
    });

    it.each(PALETTES.map((palette) => palette.id))("converts every color of %s to hex", (id) => {
        for (const mode of ["light", "dark"] as const) {
            const colors = getPresetCustomColors(id, mode);
            if (!colors) throw new Error(`${id} has no ${mode} colors`);

            expect(Object.values(normalizeCustomColorsToHex(colors)).every((value) => HEX_COLOR.test(value))).toBe(true);
        }
    });
});
