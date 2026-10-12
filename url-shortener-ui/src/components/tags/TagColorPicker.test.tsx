import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {TagColorPicker} from "@/components/tags/TagColorPicker";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";

describe("TagColorPicker", () => {
    it("offers every allowed tag color", () => {
        render(<TagColorPicker selectedColor="red" onChange={vi.fn()}/>);

        expect(screen.getAllByRole("button")).toHaveLength(ALLOWED_TAG_COLORS.length);
    });

    it.each(ALLOWED_TAG_COLORS)("reports %s when its swatch is pressed", async (color) => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<TagColorPicker selectedColor="red" onChange={onChange}/>);

        await user.click(screen.getByRole("button", {name: new RegExp(`^${color}$`, "i")}));

        expect(onChange).toHaveBeenCalledExactlyOnceWith(color);
    });
});
