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

        expect(screen.getByRole("tab", {name: "Built-in"})).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("button", {name: "Catppuccin"})).toBeInTheDocument();
    });

    it("opens on the custom builder when a custom theme is saved", () => {
        stubDesktopViewport();
        storeCustomTheme(DEFAULT_CUSTOM_COLORS.light);

        renderWithPalette(<ThemeCard/>);

        expect(screen.getByRole("tab", {name: "Custom"})).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("button", {name: "Surprise me"})).toBeInTheDocument();
    });

    it("switches between built-in and custom tabs", async () => {
        const user = userEvent.setup();
        renderWithPalette(<ThemeCard/>);

        await user.click(screen.getByRole("tab", {name: "Custom"}));
        expect(screen.getByRole("button", {name: "Surprise me"})).toBeInTheDocument();
        await user.click(screen.getByRole("tab", {name: "Built-in"}));

        expect(screen.getByRole("button", {name: "Catppuccin"})).toBeInTheDocument();
    });

    it("follows a custom theme saved from another browser tab", () => {
        renderWithPalette(<ThemeCard/>);

        syncCustomThemeFromAnotherTab();

        expect(screen.getByRole("tab", {name: "Custom"})).toHaveAttribute("aria-selected", "true");
    });

    it("keeps the tab the user picked when a custom theme arrives from another browser tab", async () => {
        const user = userEvent.setup();
        renderWithPalette(<ThemeCard/>);
        await user.click(screen.getByRole("tab", {name: "Custom"}));
        await user.click(screen.getByRole("tab", {name: "Built-in"}));

        syncCustomThemeFromAnotherTab();

        expect(screen.getByRole("tab", {name: "Built-in"})).toHaveAttribute("aria-selected", "true");
    });
});
