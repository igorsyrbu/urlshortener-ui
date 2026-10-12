import {wcagContrast, wcagLuminance} from "culori";
import {describe, expect, it, vi} from "vitest";
import {
    buildCustomTheme,
    CustomColors,
    DEFAULT_CUSTOM_COLORS,
    isValidHex,
    normalizeHex,
    parseCustomColorsInput,
    serializeCustomColors,
    surpriseMe,
} from "@/lib/themes/custom-theme";
import {TOKEN_CSS_VAR_NAMES} from "@/lib/themes/theme-tokens";

const MIN_TEXT_CONTRAST = 4.5;
const MIN_UI_CONTRAST = 3;
const HEX_COLOR = /^#[0-9a-f]{6}$/;
const SURPRISE_SAMPLE_COUNT = 50;

const BRIGHT_COLORS: CustomColors = {background: "#ffffff", card: "#ffffff", accent: "#ffff00", destructive: "#ff0000"};
const DARK_COLORS: CustomColors = {background: "#000000", card: "#050505", accent: "#202020", destructive: "#300000"};

function luminanceOf(color: string): number {
    return wcagLuminance(color);
}

describe("isValidHex", () => {
    it.each(["#fff", "#FFF", "#a1b2c3", "#A1B2C3", "  #fff  "])("accepts %j", (value) => {
        expect(isValidHex(value)).toBe(true);
    });

    it.each(["", "fff", "#ff", "#ffff", "#fffff", "#fffffff", "#ggg", "rgb(0,0,0)", "#12 345"])("rejects %j", (value) => {
        expect(isValidHex(value)).toBe(false);
    });
});

describe("normalizeHex", () => {
    it.each([
        ["#FFF", "#ffffff"],
        ["#a1b", "#aa11bb"],
        ["#A1B2C3", "#a1b2c3"],
        ["  #abc  ", "#aabbcc"],
    ])("normalizes %j to %s", (value, expected) => {
        expect(normalizeHex(value)).toBe(expected);
    });

    it.each(["", "abc", "#abcd", "red"])("returns null for %j", (value) => {
        expect(normalizeHex(value)).toBeNull();
    });
});

describe("custom color serialization", () => {
    it("joins the four colors in a fixed order", () => {
        expect(serializeCustomColors(DEFAULT_CUSTOM_COLORS.light)).toBe("#f5f4ef,#ffffff,#d96a47,#cc2525");
    });

    it("parses what it serialized", () => {
        const serialized = serializeCustomColors(DEFAULT_CUSTOM_COLORS.dark);

        expect(parseCustomColorsInput(serialized)).toEqual(DEFAULT_CUSTOM_COLORS.dark);
    });

    it("normalizes shorthand and casing while parsing", () => {
        expect(parseCustomColorsInput("#FFF, #000 ,#abc,#123456")).toEqual({
            background: "#ffffff",
            card: "#000000",
            accent: "#aabbcc",
            destructive: "#123456",
        });
    });

    it.each([
        ["too few colors", "#fff,#000,#abc"],
        ["too many colors", "#fff,#000,#abc,#123,#456"],
        ["an invalid color", "#fff,#000,#abc,nope"],
        ["an empty segment", "#fff,#000,,#123"],
        ["empty input", ""],
    ])("rejects %s", (_name, input) => {
        expect(parseCustomColorsInput(input)).toBeNull();
    });
});

describe("buildCustomTheme", () => {
    it.each([
        ["light", DEFAULT_CUSTOM_COLORS.light],
        ["dark", DEFAULT_CUSTOM_COLORS.dark],
    ] as const)("uses the authored %s colors unchanged for that mode", (mode, colors) => {
        const theme = buildCustomTheme(colors, mode);

        expect(theme[mode]).toMatchObject({
            background: colors.background,
            card: colors.card,
            primary: colors.accent,
            destructive: colors.destructive,
        });
    });

    it.each(["light", "dark"] as const)("defines every theme token as a color for both modes when authored as %s", (mode) => {
        const theme = buildCustomTheme(DEFAULT_CUSTOM_COLORS[mode], mode);

        for (const variant of [theme.light, theme.dark]) {
            expect(Object.keys(variant).sort()).toEqual(Object.keys(TOKEN_CSS_VAR_NAMES).sort());
            expect(Object.values(variant).every((value) => HEX_COLOR.test(value))).toBe(true);
        }
    });

    it("derives a dark variant from light colors and a light variant from dark colors", () => {
        const fromLight = buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light");
        const fromDark = buildCustomTheme(DEFAULT_CUSTOM_COLORS.dark, "dark");

        expect(luminanceOf(fromLight.dark.background)).toBeLessThan(luminanceOf(fromLight.light.background));
        expect(luminanceOf(fromDark.light.background)).toBeGreaterThan(luminanceOf(fromDark.dark.background));
    });

    it.each([
        ["default light", DEFAULT_CUSTOM_COLORS.light, "light"],
        ["default dark", DEFAULT_CUSTOM_COLORS.dark, "dark"],
        ["all white", BRIGHT_COLORS, "light"],
        ["near black", DARK_COLORS, "dark"],
    ] as const)("keeps text readable on its surfaces for %s colors", (_name, colors, mode) => {
        const theme = buildCustomTheme(colors, mode);

        for (const variant of [theme.light, theme.dark]) {
            expect(wcagContrast(variant.foreground, variant.card)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
            expect(wcagContrast(variant.sidebarForeground, variant.sidebar)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
            expect(wcagContrast(variant.primaryForeground, variant.primary)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
            expect(wcagContrast(variant.destructiveForeground, variant.destructive)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        }
    });

    it("nudges the derived accent until it stands out from its surface", () => {
        const darkAccent = "#222222";

        const theme = buildCustomTheme({...DEFAULT_CUSTOM_COLORS.light, accent: darkAccent}, "light");

        expect(theme.dark.primary).not.toBe(darkAccent);
        expect(wcagContrast(theme.dark.primary, theme.dark.card)).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
        expect(theme.light.primary).toBe(darkAccent);
    });

    it("links related tokens to the same source color", () => {
        const {light} = buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light");

        expect(light.popover).toBe(light.card);
        expect(light.sidebar).toBe(light.background);
        expect(light.ring).toBe(light.primary);
        expect(light.input).toBe(light.border);
        expect(light.chartClicks).toBe(light.primary);
    });

    it("uses a distinct success color per mode", () => {
        const theme = buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light");

        expect(theme.light.success).not.toBe(theme.dark.success);
    });
});

describe("surpriseMe", () => {
    function sampleColors(mode: "light" | "dark"): CustomColors[] {
        return Array.from({length: SURPRISE_SAMPLE_COUNT}, () => surpriseMe(mode));
    }

    it.each(["light", "dark"] as const)("returns four valid hex colors in %s mode", (mode) => {
        for (const colors of sampleColors(mode)) {
            expect(Object.values(colors).every((value) => HEX_COLOR.test(value))).toBe(true);
        }
    });

    it("generates light surfaces for light mode and dark surfaces for dark mode", () => {
        const light = sampleColors("light");
        const dark = sampleColors("dark");

        expect(Math.min(...light.map((colors) => luminanceOf(colors.background)))).toBeGreaterThan(
            Math.max(...dark.map((colors) => luminanceOf(colors.background))),
        );
    });

    it("is deterministic for a fixed random source", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.5);

        expect(surpriseMe("light")).toEqual(surpriseMe("light"));
    });

    it("produces results that can be turned into a theme", () => {
        const theme = buildCustomTheme(surpriseMe("dark"), "dark");

        expect(theme.light.background).toMatch(HEX_COLOR);
    });
});
