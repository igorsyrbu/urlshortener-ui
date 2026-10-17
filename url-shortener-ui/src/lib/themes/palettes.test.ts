import {describe, expect, it} from "vitest";
import {
    CUSTOM_PALETTE_ID,
    DEFAULT_PALETTE_ID,
    getPresetCustomColors,
    isKnownPaletteId,
    PALETTES,
} from "@/lib/themes/palettes";

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
