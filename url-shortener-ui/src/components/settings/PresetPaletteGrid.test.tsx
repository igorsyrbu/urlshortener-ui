import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it} from "vitest";
import {PresetPaletteGrid} from "@/components/settings/PresetPaletteGrid";
import {DEFAULT_PALETTE_ID, PALETTES} from "@/lib/themes/palettes";
import {readStoredSelection, renderWithPalette, resetDocumentTheme} from "@/test/palette-utils";

function requirePalette(isDefault: boolean): (typeof PALETTES)[number] {
    const palette = PALETTES.find((candidate) => (candidate.id === DEFAULT_PALETTE_ID) === isDefault);
    if (!palette) throw new Error("Palette fixture missing");
    return palette;
}

const NON_DEFAULT_PALETTE = requirePalette(false);
const DEFAULT_PALETTE = requirePalette(true);

describe("PresetPaletteGrid", () => {
    afterEach(() => {
        resetDocumentTheme();
    });

    it("offers every built-in palette by name", () => {
        renderWithPalette(<PresetPaletteGrid/>);

        PALETTES.forEach((palette) => {
            expect(screen.getByRole("button", {name: palette.name})).toBeInTheDocument();
        });
    });

    it("applies the chosen palette to the document and remembers it", async () => {
        const user = userEvent.setup();
        renderWithPalette(<PresetPaletteGrid/>);

        await user.click(screen.getByRole("button", {name: NON_DEFAULT_PALETTE.name}));

        expect(document.documentElement).toHaveAttribute("data-palette", NON_DEFAULT_PALETTE.id);
        expect(readStoredSelection()).toEqual({v: 2, kind: "preset", paletteId: NON_DEFAULT_PALETTE.id});
    });

    it("removes the palette attribute when the default palette is chosen again", async () => {
        const user = userEvent.setup();
        renderWithPalette(<PresetPaletteGrid/>);
        await user.click(screen.getByRole("button", {name: NON_DEFAULT_PALETTE.name}));

        await user.click(screen.getByRole("button", {name: DEFAULT_PALETTE.name}));

        expect(document.documentElement).not.toHaveAttribute("data-palette");
    });
});
