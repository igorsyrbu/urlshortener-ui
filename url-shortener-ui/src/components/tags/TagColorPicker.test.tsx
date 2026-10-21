import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {TagColorPicker} from "@/components/tags/TagColorPicker";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";

function colorName(color: string): RegExp {
    return new RegExp(`^${color}$`, "i");
}

describe("TagColorPicker", () => {
    it("offers every allowed tag color as one labelled radio group", () => {
        render(<TagColorPicker selectedColor="red" onChange={vi.fn()}/>);

        expect(screen.getByRole("radiogroup", {name: "Color"})).toBeInTheDocument();
        expect(screen.getAllByRole("radio")).toHaveLength(ALLOWED_TAG_COLORS.length);
        expect(screen.getByRole("radio", {name: colorName("red")})).toBeChecked();
    });

    it.each(ALLOWED_TAG_COLORS)("reports %s when its swatch is pressed", async (color) => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TagColorPicker selectedColor={color === "red" ? "blue" : "red"} onChange={onChange}/>);

        await user.click(screen.getByRole("radio", {name: colorName(color)}));

        expect(onChange).toHaveBeenCalledExactlyOnceWith(color);
    });

    it("is one tab stop and moves to the next color with the arrow keys", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TagColorPicker selectedColor={ALLOWED_TAG_COLORS[0]} onChange={onChange}/>);

        await user.tab();
        expect(screen.getByRole("radio", {name: colorName(ALLOWED_TAG_COLORS[0])})).toHaveFocus();
        await user.keyboard("{ArrowRight}");

        expect(screen.getByRole("radio", {name: colorName(ALLOWED_TAG_COLORS[1])})).toHaveFocus();
        await user.keyboard(" ");
        expect(onChange).toHaveBeenLastCalledWith(ALLOWED_TAG_COLORS[1]);
    });
});
