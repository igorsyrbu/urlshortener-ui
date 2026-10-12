import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {describe, expect, it, vi} from "vitest";
import {CustomColorRow} from "@/components/settings/CustomColorRow";

const INITIAL_COLOR = "#336699";

interface HarnessProps {
    onChange: (value: string) => void;
}

function Harness({onChange}: HarnessProps) {
    const [value, setValue] = useState(INITIAL_COLOR);
    return (
        <CustomColorRow
            label="Accent"
            description="Buttons and links"
            value={value}
            onChange={(next) => {
                setValue(next);
                onChange(next);
            }}
        />
    );
}

async function openHexField(): Promise<{user: ReturnType<typeof userEvent.setup>; field: HTMLElement}> {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", {name: "Pick Accent color"}));
    return {user, field: await screen.findByRole("textbox", {name: "Accent hex value"})};
}

describe("CustomColorRow", () => {
    it("shows the label and description", () => {
        render(<Harness onChange={vi.fn()}/>);

        expect(screen.getByText("Accent")).toBeInTheDocument();
        expect(screen.getByText("Buttons and links")).toBeInTheDocument();
    });

    it("shows the current colour in the hex field of the picker", async () => {
        render(<Harness onChange={vi.fn()}/>);

        const {field} = await openHexField();

        expect(field).toHaveValue(INITIAL_COLOR);
    });

    it("applies a complete hex value as soon as it is typed, lowercased", async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange}/>);
        const {user, field} = await openHexField();

        await user.clear(field);
        await user.type(field, "#FF8800");

        expect(onChange).toHaveBeenCalledExactlyOnceWith("#ff8800");
    });

    it("does not apply an incomplete value while typing", async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange}/>);
        const {user, field} = await openHexField();

        await user.clear(field);
        await user.type(field, "#ff88");

        expect(onChange).not.toHaveBeenCalled();
        expect(field).toHaveValue("#ff88");
    });

    it("expands a three-digit shorthand when Enter is pressed", async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange}/>);
        const {user, field} = await openHexField();

        await user.clear(field);
        await user.type(field, "#abc{Enter}");

        expect(onChange).toHaveBeenCalledExactlyOnceWith("#aabbcc");
    });

    it("applies the typed value when the field loses focus", async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange}/>);
        const {user, field} = await openHexField();

        await user.clear(field);
        await user.type(field, "#abc");
        await user.tab();

        expect(onChange).toHaveBeenCalledExactlyOnceWith("#aabbcc");
    });

    it("flags an invalid value and reverts to the current colour on blur", async () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange}/>);
        const {user, field} = await openHexField();

        await user.clear(field);
        await user.type(field, "not-a-colour");
        expect(field).toBeInvalid();
        await user.tab();

        expect(onChange).not.toHaveBeenCalled();
        expect(field).toHaveValue(INITIAL_COLOR);
        expect(field).toBeValid();
    });
});
