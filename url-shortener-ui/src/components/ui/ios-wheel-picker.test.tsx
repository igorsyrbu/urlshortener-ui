import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {findSelectableIndex, IosWheelPicker, type WheelPickerItem} from "@/components/ui/ios-wheel-picker";

vi.mock("embla-carousel-react", () => ({default: () => [vi.fn(), undefined]}));

const MONTHS: WheelPickerItem[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((label) => ({label}));
const WITH_DISABLED: WheelPickerItem[] = [{label: "A"}, {label: "B", disabled: true}, {label: "C"}, {label: "D", disabled: true}];

function renderPicker(selectedIndex = 2, items = MONTHS, loop = false): ReturnType<typeof vi.fn<(index: number) => void>> {
    const onChange = vi.fn<(index: number) => void>();
    render(<IosWheelPicker ariaLabel="Month" items={items} selectedIndex={selectedIndex} onChange={onChange} loop={loop}/>);
    return onChange;
}

describe("IosWheelPicker for keyboard and screen reader users", () => {
    it("is a named, focusable listbox that points at the selected option", () => {
        renderPicker(2);

        const listbox = screen.getByRole("listbox", {name: "Month"});
        const selected = screen.getByRole("option", {name: "Mar"});
        expect(listbox).toHaveAttribute("tabindex", "0");
        expect(selected).toHaveAttribute("aria-selected", "true");
        expect(listbox).toHaveAttribute("aria-activedescendant", selected.id);
    });

    it.each([
        ["{ArrowDown}", 3],
        ["{ArrowUp}", 1],
        ["{Home}", 0],
        ["{End}", 6],
        ["{PageDown}", 6],
    ])("moves the selection with %s", async (key, expected) => {
        const user = userEvent.setup();
        const onChange = renderPicker(2);
        screen.getByRole("listbox").focus();

        await user.keyboard(key);

        expect(onChange).toHaveBeenCalledExactlyOnceWith(expected);
    });

    it("stays put at the end of a wheel that does not loop", async () => {
        const user = userEvent.setup();
        const onChange = renderPicker(6);
        screen.getByRole("listbox").focus();

        await user.keyboard("{ArrowDown}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("marks disabled options", () => {
        renderPicker(0, WITH_DISABLED);

        expect(screen.getByRole("option", {name: "B"})).toHaveAttribute("aria-disabled", "true");
    });
});

describe("findSelectableIndex", () => {
    it("skips disabled items", () => {
        expect(findSelectableIndex(WITH_DISABLED, 0, 1, false)).toBe(2);
        expect(findSelectableIndex(WITH_DISABLED, 2, -1, false)).toBe(0);
    });

    it("wraps around a looping wheel", () => {
        expect(findSelectableIndex(MONTHS, 6, 1, true)).toBe(0);
        expect(findSelectableIndex(MONTHS, 0, -1, true)).toBe(6);
    });

    it("stops at the last selectable item before the end", () => {
        expect(findSelectableIndex(WITH_DISABLED, 2, 1, false)).toBe(2);
        expect(findSelectableIndex(MONTHS, 4, 5, false)).toBe(6);
    });
});
