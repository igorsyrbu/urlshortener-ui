import {afterEach, describe, expect, it, vi} from "vitest";
import {THEME_PALETTE_STORAGE_KEY} from "@/lib/constants";
import {buildPaletteInitScript} from "@/lib/themes/palette-init-script";
import {TOKEN_CSS_VAR_NAMES, TOKEN_ENTRIES} from "@/lib/themes/theme-tokens";
import {buildCustomTheme, DEFAULT_CUSTOM_COLORS} from "@/lib/themes/custom-theme";

const COLOR_MODE_STORAGE_KEY = "theme";
const SELECTION_VERSION = 2;
const derivedTheme = buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light");

function runInitScript(): void {
    new Function(buildPaletteInitScript())();
}

function storeSelection(selection: unknown): void {
    localStorage.setItem(THEME_PALETTE_STORAGE_KEY, JSON.stringify(selection));
}

function storeCustomSelection(): void {
    storeSelection({v: SELECTION_VERSION, kind: "custom", colors: DEFAULT_CUSTOM_COLORS.light, authoredMode: "light", derived: derivedTheme});
}

function stubSystemPrefersDark(prefersDark: boolean): void {
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({matches: prefersDark && query.includes("dark")})));
}

function readCssVar(name: string): string {
    return document.documentElement.style.getPropertyValue(name);
}

describe("palette init script", () => {
    afterEach(() => {
        document.documentElement.removeAttribute("data-palette");
        document.documentElement.removeAttribute("style");
    });

    it("does nothing when no selection is stored", () => {
        runInitScript();

        expect(document.documentElement.hasAttribute("data-palette")).toBe(false);
        expect(document.documentElement.getAttribute("style")).toBeNull();
    });

    it("applies a stored preset through the data-palette attribute", () => {
        storeSelection({v: SELECTION_VERSION, kind: "preset", paletteId: "ayu"});

        runInitScript();

        expect(document.documentElement.getAttribute("data-palette")).toBe("ayu");
    });

    it("leaves the default preset to the stylesheet defaults", () => {
        storeSelection({v: SELECTION_VERSION, kind: "preset", paletteId: "default"});

        runInitScript();

        expect(document.documentElement.hasAttribute("data-palette")).toBe(false);
    });

    it("ignores a preset without a string palette id", () => {
        storeSelection({v: SELECTION_VERSION, kind: "preset", paletteId: 5});

        runInitScript();

        expect(document.documentElement.hasAttribute("data-palette")).toBe(false);
    });

    it.each([
        ["light", "light", false, derivedTheme.light],
        ["dark", "dark", false, derivedTheme.dark],
        ["system with a dark OS", "system", true, derivedTheme.dark],
        ["system with a light OS", "system", false, derivedTheme.light],
    ] as const)("applies the custom %s tokens", (_name, storedMode, systemPrefersDark, expectedTokens) => {
        storeCustomSelection();
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, storedMode);
        stubSystemPrefersDark(systemPrefersDark);

        runInitScript();

        for (const [token, cssVar] of TOKEN_ENTRIES) {
            expect(readCssVar(cssVar)).toBe(expectedTokens[token]);
        }
    });

    it("follows the OS color scheme when no mode is stored", () => {
        storeCustomSelection();
        stubSystemPrefersDark(true);

        runInitScript();

        expect(readCssVar(TOKEN_CSS_VAR_NAMES.background)).toBe(derivedTheme.dark.background);
    });

    it("applies the stored mode even when the OS prefers the opposite", () => {
        storeCustomSelection();
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");
        stubSystemPrefersDark(true);

        runInitScript();

        expect(readCssVar(TOKEN_CSS_VAR_NAMES.background)).toBe(derivedTheme.light.background);
    });

    it("skips tokens that are not strings", () => {
        storeSelection({kind: "custom", derived: {light: {background: "#123456", foreground: 7}, dark: {}}});
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");

        runInitScript();

        expect(readCssVar(TOKEN_CSS_VAR_NAMES.background)).toBe("#123456");
        expect(readCssVar(TOKEN_CSS_VAR_NAMES.foreground)).toBe("");
    });

    it.each([
        ["a url()", "url(https://attacker.example/pixel)"],
        ["a var() reference", "var(--anything)"],
        ["a named colour", "red"],
        ["a hex with extra text", "#123456;background:red"],
        ["a hex with four digits", "#1234"],
    ])("skips a token that is %s instead of a hex colour", (_name, value) => {
        storeSelection({kind: "custom", derived: {light: {background: value, card: "#abc"}, dark: {}}});
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");

        runInitScript();

        expect(readCssVar(TOKEN_CSS_VAR_NAMES.background)).toBe("");
        expect(readCssVar(TOKEN_CSS_VAR_NAMES.card)).toBe("#abc");
    });

    it("applies nothing when the tokens for the active mode are missing", () => {
        storeSelection({kind: "custom", derived: {dark: {background: "#000000"}}});
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");

        runInitScript();

        expect(document.documentElement.getAttribute("style")).toBeNull();
    });

    it.each([
        ["malformed JSON", "{broken"],
        ["a JSON null", "null"],
        ["a JSON primitive", "42"],
    ])("never throws for %s", (_name, raw) => {
        localStorage.setItem(THEME_PALETTE_STORAGE_KEY, raw);

        expect(runInitScript).not.toThrow();
        expect(document.documentElement.hasAttribute("data-palette")).toBe(false);
    });

    it("never throws when localStorage is unavailable", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new Error("denied"); });

        expect(runInitScript).not.toThrow();
    });
});
