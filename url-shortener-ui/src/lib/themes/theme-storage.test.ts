import {describe, expect, it, vi} from "vitest";
import {THEME_PALETTE_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {buildCustomTheme, CustomThemeDerived, DEFAULT_CUSTOM_COLORS} from "@/lib/themes/custom-theme";
import {
    clearThemeSelection,
    DEFAULT_THEME_SELECTION,
    getThemeSelection,
    setThemeSelection,
    subscribeThemeSelection,
    ThemeSelection,
} from "@/lib/themes/theme-storage";
import {TOKEN_CSS_VAR_NAMES} from "@/lib/themes/theme-tokens";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn()}}));

const SELECTION_VERSION = DEFAULT_THEME_SELECTION.v;

function createCustomDerived(): CustomThemeDerived {
    return buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light");
}

function createCustomSelection(): ThemeSelection {
    return {
        v: SELECTION_VERSION,
        kind: "custom",
        colors: DEFAULT_CUSTOM_COLORS.light,
        authoredMode: "light",
        derived: buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light"),
    };
}

function storeJson(value: unknown): void {
    localStorage.setItem(THEME_PALETTE_STORAGE_KEY, JSON.stringify(value));
}

function createIncompleteTokenMap(): Record<string, string> {
    const [firstToken] = Object.keys(TOKEN_CSS_VAR_NAMES);
    return Object.fromEntries(Object.entries(createCustomDerived().light).filter(([token]) => token !== firstToken));
}

function createSelectionWithDerivedLightToken(value: string): unknown {
    const derived = createCustomDerived();
    return {...createCustomSelection(), derived: {light: {...derived.light, background: value}, dark: derived.dark}};
}

describe("theme selection storage", () => {
    it("defaults to the default preset", () => {
        expect(DEFAULT_THEME_SELECTION).toEqual({v: SELECTION_VERSION, kind: "preset", paletteId: "default"});
    });

    it("returns null when nothing is stored", () => {
        expect(getThemeSelection()).toBeNull();
    });

    it("restores a stored preset selection", () => {
        const selection: ThemeSelection = {v: SELECTION_VERSION, kind: "preset", paletteId: "ayu"};

        setThemeSelection(selection);

        expect(getThemeSelection()).toEqual(selection);
    });

    it("restores a stored custom selection", () => {
        const selection = createCustomSelection();

        setThemeSelection(selection);

        expect(getThemeSelection()).toEqual(selection);
    });

    it("removes the stored selection when cleared", () => {
        setThemeSelection({v: SELECTION_VERSION, kind: "preset", paletteId: "ayu"});

        clearThemeSelection();

        expect(getThemeSelection()).toBeNull();
    });

    it.each([
        ["an unknown palette", {v: SELECTION_VERSION, kind: "preset", paletteId: "missing"}],
        ["a non-string palette id", {v: SELECTION_VERSION, kind: "preset", paletteId: 7}],
        ["an outdated version", {v: SELECTION_VERSION - 1, kind: "preset", paletteId: "ayu"}],
        ["a missing version", {kind: "preset", paletteId: "ayu"}],
        ["an unknown kind", {v: SELECTION_VERSION, kind: "other"}],
        ["a JSON null", null],
        ["a JSON string", "ayu"],
        ["custom colors that are not hex", {...createCustomSelection(), colors: {...DEFAULT_CUSTOM_COLORS.light, accent: "red"}}],
        ["custom colors that are missing", {...createCustomSelection(), colors: {background: "#ffffff"}}],
        ["an unknown authored mode", {...createCustomSelection(), authoredMode: "sepia"}],
        ["missing derived tokens", {...createCustomSelection(), derived: undefined}],
        ["an incomplete derived token map", {...createCustomSelection(), derived: {light: createIncompleteTokenMap(), dark: createCustomDerived().dark}}],
        ["a derived token that is a url()", createSelectionWithDerivedLightToken("url(https://attacker.example/pixel)")],
        ["a derived token that is a named colour", createSelectionWithDerivedLightToken("red")],
        ["a derived token with CSS after the hex", createSelectionWithDerivedLightToken("#123456;background:red")],
    ])("ignores %s", (_name, stored) => {
        storeJson(stored);

        expect(getThemeSelection()).toBeNull();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("logs and returns null when the stored value is not valid JSON", () => {
        localStorage.setItem(THEME_PALETTE_STORAGE_KEY, "{broken");

        expect(getThemeSelection()).toBeNull();
        expect(logger.error).toHaveBeenCalledWith("Failed to load theme selection from localStorage", expect.any(SyntaxError));
    });

    it("logs instead of throwing when storage is unavailable", () => {
        const storageError = new Error("denied");
        vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw storageError; });
        vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw storageError; });
        vi.spyOn(localStorage, "removeItem").mockImplementation(() => { throw storageError; });

        expect(getThemeSelection()).toBeNull();
        expect(() => setThemeSelection(DEFAULT_THEME_SELECTION)).not.toThrow();
        expect(() => clearThemeSelection()).not.toThrow();
        expect(logger.error).toHaveBeenCalledTimes(3);
    });
});

describe("subscribeThemeSelection", () => {
    function dispatchStorageEvent(key: string | null): void {
        window.dispatchEvent(new StorageEvent("storage", {key}));
    }

    it("notifies when the theme selection changes in another tab", () => {
        const callback = vi.fn();
        subscribeThemeSelection(callback);

        dispatchStorageEvent(THEME_PALETTE_STORAGE_KEY);

        expect(callback).toHaveBeenCalledOnce();
    });

    it("ignores changes to unrelated keys", () => {
        const callback = vi.fn();
        subscribeThemeSelection(callback);

        dispatchStorageEvent("something-else");

        expect(callback).not.toHaveBeenCalled();
    });

    it("stops notifying after unsubscribing", () => {
        const callback = vi.fn();
        const unsubscribe = subscribeThemeSelection(callback);

        unsubscribe();
        dispatchStorageEvent(THEME_PALETTE_STORAGE_KEY);

        expect(callback).not.toHaveBeenCalled();
    });
});
