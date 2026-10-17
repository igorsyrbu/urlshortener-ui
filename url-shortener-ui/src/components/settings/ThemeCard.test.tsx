import {act, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it} from "vitest";
import {ThemeCard} from "@/components/settings/ThemeCard";
import {THEME_PALETTE_STORAGE_KEY} from "@/lib/constants";
import {DEFAULT_CUSTOM_COLORS} from "@/lib/themes/custom-theme";
import {renderWithPalette, resetDocumentTheme, storeCustomTheme} from "@/test/palette-utils";
import {stubDesktopViewport} from "@/test/viewport-utils";

function syncCustomThemeFromAnotherTab(): void {
    act(() => {
        storeCustomTheme(DEFAULT_CUSTOM_COLORS.light);
        window.dispatchEvent(new StorageEvent("storage", {key: THEME_PALETTE_STORAGE_KEY}));
    });
}

describe("ThemeCard", () => {
    afterEach(() => {
        resetDocumentTheme();
    });

    it("opens on the built-in palettes by default", () => {
        renderWithPalette(<ThemeCard/>);

        expect(screen.getByRole("button", {name: "Built-in"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", {name: "Catppuccin"})).toBeInTheDocument();
    });

    it("opens on the custom builder when a custom theme is saved", async () => {
        stubDesktopViewport();
        storeCustomTheme(DEFAULT_CUSTOM_COLORS.light);

        renderWithPalette(<ThemeCard/>);

        expect(screen.getByRole("button", {name: "Custom"})).toHaveAttribute("aria-pressed", "true");
        expect(await screen.findByRole("button", {name: "Surprise me"})).toBeInTheDocument();
    });

    it("switches between built-in and custom tabs", async () => {
        const user = userEvent.setup();
        renderWithPalette(<ThemeCard/>);

        await user.click(screen.getByRole("button", {name: "Custom"}));
        expect(await screen.findByRole("button", {name: "Surprise me"})).toBeInTheDocument();
        await user.click(screen.getByRole("button", {name: "Built-in"}));

        expect(screen.getByRole("button", {name: "Catppuccin"})).toBeInTheDocument();
    });

    it("keeps the built-in palettes selected while the custom tab is hovered", async () => {
        const user = userEvent.setup();
        renderWithPalette(<ThemeCard/>);

        await user.hover(screen.getByRole("button", {name: "Custom"}));

        expect(screen.getByRole("button", {name: "Built-in"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", {name: "Custom"})).toHaveAttribute("aria-pressed", "false");
    });

    it("follows a custom theme saved from another browser tab", () => {
        renderWithPalette(<ThemeCard/>);

        syncCustomThemeFromAnotherTab();

        expect(screen.getByRole("button", {name: "Custom"})).toHaveAttribute("aria-pressed", "true");
    });

    it("keeps the tab the user picked when a custom theme arrives from another browser tab", async () => {
        const user = userEvent.setup();
        renderWithPalette(<ThemeCard/>);
        await user.click(screen.getByRole("button", {name: "Custom"}));
        await user.click(screen.getByRole("button", {name: "Built-in"}));

        syncCustomThemeFromAnotherTab();

        expect(screen.getByRole("button", {name: "Built-in"})).toHaveAttribute("aria-pressed", "true");
    });
});
