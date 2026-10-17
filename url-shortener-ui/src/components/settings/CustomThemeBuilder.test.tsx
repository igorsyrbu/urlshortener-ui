import {act, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CustomThemeBuilder} from "@/components/settings/CustomThemeBuilder";
import {COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import {CustomColors, DEFAULT_CUSTOM_COLORS, normalizeCustomColorsToHex, serializeCustomColors} from "@/lib/themes/custom-theme";
import {isValidHex} from "@/lib/themes/hex";
import {getPresetCustomColors} from "@/lib/themes/palettes";
import {
    readStoredSelection,
    renderWithPalette,
    resetDocumentTheme,
    storeCustomTheme,
} from "@/test/palette-utils";
import {setResolvedTheme} from "@/test/next-themes-utils";
import {stubDesktopViewport} from "@/test/viewport-utils";

vi.mock("next-themes", async () => (await import("@/test/next-themes-utils")).nextThemesMock);
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));
vi.mock("sonner", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const LIGHT_DEFAULTS = DEFAULT_CUSTOM_COLORS.light;
const IMPORTED_THEME = "#101010,#202020,#303030,#404040";

function requirePresetColors(paletteId: string): ReturnType<typeof normalizeCustomColorsToHex> {
    const colors = getPresetCustomColors(paletteId, "light");
    if (!colors) throw new Error(`Unknown palette ${paletteId}`);
    return normalizeCustomColorsToHex(colors);
}

type User = ReturnType<typeof userEvent.setup>;

async function readHexOf(user: User, label: string): Promise<string> {
    await user.click(screen.getByRole("button", {name: `Pick ${label} color`}));
    const field = await screen.findByRole("textbox", {name: `${label} hex value`});
    const value = (field as HTMLInputElement).value;
    await user.keyboard("{Escape}");
    return value;
}

function storedColors(): CustomColors | null {
    const selection = readStoredSelection();
    return selection?.kind === "custom" ? selection.colors : null;
}

describe("CustomThemeBuilder", () => {
    beforeEach(() => {
        stubDesktopViewport();
    });

    afterEach(() => {
        vi.useRealTimers();
        resetDocumentTheme();
    });

    it("starts from the default light colours", async () => {
        const user = userEvent.setup();
        renderWithPalette(<CustomThemeBuilder/>);

        expect(await readHexOf(user, "Background")).toBe(LIGHT_DEFAULTS.background);
        expect(await readHexOf(user, "Cards")).toBe(LIGHT_DEFAULTS.card);
        expect(await readHexOf(user, "Accent")).toBe(LIGHT_DEFAULTS.accent);
        expect(await readHexOf(user, "Danger")).toBe(LIGHT_DEFAULTS.destructive);
    });

    it("starts from the default dark colours in dark mode", async () => {
        setResolvedTheme("dark");
        const user = userEvent.setup();
        renderWithPalette(<CustomThemeBuilder/>);

        expect(await readHexOf(user, "Background")).toBe(DEFAULT_CUSTOM_COLORS.dark.background);
    });

    it("shows the colours of the selected built-in palette as the starting point", async () => {
        const user = userEvent.setup();
        window.localStorage.setItem("themePalette", JSON.stringify({v: 2, kind: "preset", paletteId: "catppuccin"}));
        renderWithPalette(<CustomThemeBuilder/>);
        const expected = requirePresetColors("catppuccin");

        expect(await readHexOf(user, "Background")).toBe(expected.background.toLowerCase());
        expect(await readHexOf(user, "Accent")).toBe(expected.accent.toLowerCase());
    });

    it("saves a colour edit as a custom theme and keeps the other colours", async () => {
        const user = userEvent.setup();
        renderWithPalette(<CustomThemeBuilder/>);
        await user.click(screen.getByRole("button", {name: "Pick Accent color"}));
        const field = await screen.findByRole("textbox", {name: "Accent hex value"});

        await user.clear(field);
        await user.type(field, "#123456");

        expect(storedColors()).toEqual({...LIGHT_DEFAULTS, accent: "#123456"});
    });

    it("generates a random valid theme with Surprise me", async () => {
        const user = userEvent.setup();
        renderWithPalette(<CustomThemeBuilder/>);

        await user.click(screen.getByRole("button", {name: "Surprise me"}));

        const colors = storedColors();
        expect(Object.keys(colors ?? {}).sort()).toEqual(["accent", "background", "card", "destructive"]);
        Object.values(colors ?? {}).forEach((color) => expect(isValidHex(color)).toBe(true));
    });

    describe("sharing", () => {
        it("copies the colours to the clipboard and briefly confirms", async () => {
            vi.useFakeTimers({shouldAdvanceTime: true});
            const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
            renderWithPalette(<CustomThemeBuilder/>);

            await user.click(screen.getByRole("button", {name: "Share theme"}));

            expect(await screen.findByRole("button", {name: "Theme copied"})).toBeInTheDocument();
            expect(await navigator.clipboard.readText()).toBe(serializeCustomColors(LIGHT_DEFAULTS));
            await act(async () => {
                await vi.advanceTimersByTimeAsync(COPY_FEEDBACK_DURATION_MS);
            });
            expect(screen.getByRole("button", {name: "Share theme"})).toBeInTheDocument();
        });

        it("shows an error toast when the clipboard is unavailable", async () => {
            const user = userEvent.setup();
            renderWithPalette(<CustomThemeBuilder/>);
            vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));

            await user.click(screen.getByRole("button", {name: "Share theme"}));

            await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Failed to copy theme"));
            expect(screen.getByRole("button", {name: "Share theme"})).toBeInTheDocument();
        });
    });

    describe("importing", () => {
        async function openImportDialog(user: User): Promise<HTMLElement> {
            await user.click(screen.getByRole("button", {name: "Import"}));
            return screen.findByRole("textbox");
        }

        it("applies a valid theme, closes the dialog and confirms", async () => {
            const user = userEvent.setup();
            renderWithPalette(<CustomThemeBuilder/>);
            const input = await openImportDialog(user);

            await user.type(input, IMPORTED_THEME);
            await user.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Import"}));

            expect(storedColors()).toEqual({background: "#101010", card: "#202020", accent: "#303030", destructive: "#404040"});
            expect(toast.success).toHaveBeenCalledExactlyOnceWith("Theme imported");
            await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
        });

        it("rejects an invalid theme and keeps the dialog open", async () => {
            const user = userEvent.setup();
            renderWithPalette(<CustomThemeBuilder/>);
            const input = await openImportDialog(user);

            await user.type(input, "#101010,#202020,nope{Enter}");

            expect(await screen.findByText(/Invalid theme/)).toBeInTheDocument();
            expect(readStoredSelection()).toBeNull();
            expect(toast.success).not.toHaveBeenCalled();
        });

        it("clears the error as soon as the user edits the text", async () => {
            const user = userEvent.setup();
            renderWithPalette(<CustomThemeBuilder/>);
            const input = await openImportDialog(user);
            await user.type(input, "bad{Enter}");
            await screen.findByText(/Invalid theme/);

            await user.type(input, "x");

            expect(screen.queryByText(/Invalid theme/)).not.toBeInTheDocument();
        });

        it("discards the draft when the dialog is cancelled", async () => {
            const user = userEvent.setup();
            renderWithPalette(<CustomThemeBuilder/>);
            const input = await openImportDialog(user);
            await user.type(input, "bad{Enter}");
            await user.click(screen.getByRole("button", {name: "Cancel"}));
            await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());

            const reopenedInput = await openImportDialog(user);

            expect(reopenedInput).toHaveValue("");
            expect(screen.queryByText(/Invalid theme/)).not.toBeInTheDocument();
        });
    });

    it("keeps showing a previously saved custom theme", async () => {
        const user = userEvent.setup();
        storeCustomTheme({background: "#0a0b0c", card: "#0d0e0f", accent: "#aa0000", destructive: "#bb0000"});
        renderWithPalette(<CustomThemeBuilder/>);

        expect(await readHexOf(user, "Background")).toBe("#0a0b0c");
    });
});
