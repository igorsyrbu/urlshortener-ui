import {render, screen} from "@testing-library/react";
import React from "react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {THEME_PALETTE_STORAGE_KEY} from "@/lib/constants";
import {buildCustomTheme, DEFAULT_CUSTOM_COLORS} from "@/lib/themes/custom-theme";
import {CUSTOM_PALETTE_ID, DEFAULT_PALETTE_ID} from "@/lib/themes/palettes";
import {DEFAULT_THEME_SELECTION, getThemeSelection} from "@/lib/themes/theme-storage";
import {TOKEN_CSS_VAR_NAMES} from "@/lib/themes/theme-tokens";
import {PaletteProvider, usePalette} from "@/providers/palette-provider";

const mocks = vi.hoisted(() => ({resolvedTheme: "light" as string | undefined}));
vi.mock("next-themes", () => ({useTheme: () => ({resolvedTheme: mocks.resolvedTheme})}));

const SELECTION_VERSION = DEFAULT_THEME_SELECTION.v;
const PRESET_ID = "ayu";
const root = document.documentElement;

function PaletteConsumer(): React.ReactElement {
    const {activePaletteId, selectPreset, applyCustomColors, resetToDefault} = usePalette();
    return (
        <div>
            <output>{activePaletteId}</output>
            <button onClick={() => selectPreset(PRESET_ID)}>select preset</button>
            <button onClick={() => applyCustomColors(DEFAULT_CUSTOM_COLORS.light, "light")}>apply custom</button>
            <button onClick={resetToDefault}>reset</button>
        </div>
    );
}

function renderProvider(): void {
    render(<PaletteProvider><PaletteConsumer/></PaletteProvider>);
}

function storePreset(paletteId: string): void {
    localStorage.setItem(THEME_PALETTE_STORAGE_KEY, JSON.stringify({v: SELECTION_VERSION, kind: "preset", paletteId}));
}

function readBackground(): string {
    return root.style.getPropertyValue(TOKEN_CSS_VAR_NAMES.background);
}

describe("PaletteProvider", () => {
    afterEach(() => {
        mocks.resolvedTheme = "light";
        root.removeAttribute("data-palette");
        root.removeAttribute("style");
        document.head.innerHTML = "";
    });

    it("starts on the default palette without touching the document", () => {
        renderProvider();

        expect(screen.getByRole("status")).toHaveTextContent(DEFAULT_PALETTE_ID);
        expect(root.hasAttribute("data-palette")).toBe(false);
    });

    it("restores and applies a stored preset", () => {
        storePreset(PRESET_ID);

        renderProvider();

        expect(screen.getByRole("status")).toHaveTextContent(PRESET_ID);
        expect(root).toHaveAttribute("data-palette", PRESET_ID);
    });

    it("selecting a preset applies and persists it", async () => {
        const user = userEvent.setup();
        renderProvider();

        await user.click(screen.getByRole("button", {name: "select preset"}));

        expect(root).toHaveAttribute("data-palette", PRESET_ID);
        expect(getThemeSelection()).toEqual({v: SELECTION_VERSION, kind: "preset", paletteId: PRESET_ID});
    });

    it("resetting to default removes the palette attribute", async () => {
        storePreset(PRESET_ID);
        const user = userEvent.setup();
        renderProvider();

        await user.click(screen.getByRole("button", {name: "reset"}));

        expect(root.hasAttribute("data-palette")).toBe(false);
        expect(screen.getByRole("status")).toHaveTextContent(DEFAULT_PALETTE_ID);
    });

    it("applying custom colors sets inline tokens and replaces the preset attribute", async () => {
        storePreset(PRESET_ID);
        const user = userEvent.setup();
        renderProvider();

        await user.click(screen.getByRole("button", {name: "apply custom"}));

        expect(screen.getByRole("status")).toHaveTextContent(CUSTOM_PALETTE_ID);
        expect(root.hasAttribute("data-palette")).toBe(false);
        expect(readBackground()).toBe(DEFAULT_CUSTOM_COLORS.light.background);
        expect(getThemeSelection()).toMatchObject({kind: "custom", authoredMode: "light"});
    });

    it.each([
        ["dark", "dark"],
        ["light", "light"],
        [undefined, "light"],
    ] as const)("uses the derived %s tokens when the resolved theme is %s", async (resolvedTheme, derivedMode) => {
        mocks.resolvedTheme = resolvedTheme;
        const user = userEvent.setup();
        renderProvider();

        await user.click(screen.getByRole("button", {name: "apply custom"}));

        expect(readBackground()).toBe(buildCustomTheme(DEFAULT_CUSTOM_COLORS.light, "light")[derivedMode].background);
    });

    it("clears inline tokens when switching from custom colors back to a preset", async () => {
        const user = userEvent.setup();
        renderProvider();
        await user.click(screen.getByRole("button", {name: "apply custom"}));

        await user.click(screen.getByRole("button", {name: "select preset"}));

        expect(readBackground()).toBe("");
        expect(root).toHaveAttribute("data-palette", PRESET_ID);
    });

    it("resetting forgets the stored selection", async () => {
        storePreset(PRESET_ID);
        const user = userEvent.setup();
        renderProvider();

        await user.click(screen.getByRole("button", {name: "reset"}));

        expect(localStorage.getItem(THEME_PALETTE_STORAGE_KEY)).toBeNull();
    });

    it("follows selection changes made in another tab", async () => {
        renderProvider();

        storePreset(PRESET_ID);
        window.dispatchEvent(new StorageEvent("storage", {key: THEME_PALETTE_STORAGE_KEY}));

        expect(await screen.findByText(PRESET_ID)).toBeInTheDocument();
        expect(root).toHaveAttribute("data-palette", PRESET_ID);
    });

    it("falls back to the default palette when another tab clears the selection", async () => {
        storePreset(PRESET_ID);
        renderProvider();

        localStorage.removeItem(THEME_PALETTE_STORAGE_KEY);
        window.dispatchEvent(new StorageEvent("storage", {key: THEME_PALETTE_STORAGE_KEY}));

        expect(await screen.findByText(DEFAULT_PALETTE_ID)).toBeInTheDocument();
    });

    it("keeps the browser theme-color meta in sync with the background token", async () => {
        document.head.innerHTML = '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#000000">';
        const user = userEvent.setup();
        renderProvider();

        await user.click(screen.getByRole("button", {name: "apply custom"}));

        expect(document.querySelector("meta[name=theme-color]")).toHaveAttribute("content", DEFAULT_CUSTOM_COLORS.light.background);
    });
});

describe("usePalette", () => {
    it("throws when used outside the provider", () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        expect(() => render(<PaletteConsumer/>)).toThrow("usePalette must be used within PaletteProvider");
    });
});
