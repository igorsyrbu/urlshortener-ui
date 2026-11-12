import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {describe, expect, it, vi} from "vitest";
import {LinkPasswordField} from "@/components/links/LinkPasswordField";
import {GENERATED_LINK_PASSWORD_LENGTH, LINK_PASSWORD_COPY} from "@/lib/constants";

const INPUT_ID = "linkPassword";
const ERROR = "Password must be 5 to 50 characters.";
const GENERATED_PASSWORD_PATTERN = new RegExp(`^[A-Za-z0-9]{${GENERATED_LINK_PASSWORD_LENGTH}}$`);

interface FieldHarnessProps {
    initialPassword: string;
    error: string | null;
}

function FieldHarness({initialPassword, error}: FieldHarnessProps) {
    const [password, setPassword] = useState(initialPassword);
    return (
        <LinkPasswordField
            inputId={INPUT_ID}
            isEnabled
            password={password}
            error={error}
            onEnabledChange={vi.fn()}
            onPasswordChange={setPassword}
            isCompact
        />
    );
}

function renderSwitchOnly(isEnabled: boolean): ReturnType<typeof vi.fn<(isEnabled: boolean) => void>> {
    const onEnabledChange = vi.fn<(isEnabled: boolean) => void>();
    render(
        <LinkPasswordField
            inputId={INPUT_ID}
            isEnabled={isEnabled}
            password=""
            error={null}
            onEnabledChange={onEnabledChange}
            onPasswordChange={vi.fn()}
            isCompact={false}
        />,
    );
    return onEnabledChange;
}

describe("LinkPasswordField", () => {
    it("labels the row Password and turns protection on through its switch", async () => {
        const user = userEvent.setup();
        const onEnabledChange = renderSwitchOnly(false);

        expect(screen.getByText(LINK_PASSWORD_COPY.FIELD_LABEL)).toBeInTheDocument();
        await user.click(screen.getByRole("switch", {name: LINK_PASSWORD_COPY.TOGGLE_LABEL}));

        expect(onEnabledChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("toggles the switch when its visible label is clicked", async () => {
        const user = userEvent.setup();
        const onEnabledChange = renderSwitchOnly(false);

        await user.click(screen.getByText(LINK_PASSWORD_COPY.FIELD_LABEL));

        expect(onEnabledChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("explains the option in a tooltip and describes the switch with it", async () => {
        const user = userEvent.setup();
        renderSwitchOnly(false);

        await user.click(screen.getByRole("button", {name: LINK_PASSWORD_COPY.HINT_BUTTON}));

        expect(await screen.findByRole("tooltip")).toHaveTextContent(LINK_PASSWORD_COPY.TOGGLE_HINT);
        expect(screen.getByRole("switch", {name: LINK_PASSWORD_COPY.TOGGLE_LABEL})).toHaveAccessibleDescription(LINK_PASSWORD_COPY.TOGGLE_HINT);
    });

    it("offers no password box while protection is off", () => {
        renderSwitchOnly(false);

        expect(screen.queryByLabelText(LINK_PASSWORD_COPY.INPUT_LABEL)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: LINK_PASSWORD_COPY.GENERATE})).not.toBeInTheDocument();
    });

    it("ties the validation error to the password box", () => {
        render(<FieldHarness initialPassword="abc" error={ERROR}/>);

        const input = screen.getByLabelText(LINK_PASSWORD_COPY.INPUT_LABEL);
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription(ERROR);
    });

    it("fills in a random letters-and-digits password and shows it", async () => {
        const user = userEvent.setup();
        render(<FieldHarness initialPassword="" error={null}/>);
        const input = screen.getByLabelText(LINK_PASSWORD_COPY.INPUT_LABEL);

        await user.click(screen.getByRole("button", {name: LINK_PASSWORD_COPY.GENERATE}));

        expect(input).toHaveDisplayValue(GENERATED_PASSWORD_PATTERN);
        expect(input).toHaveAttribute("type", "text");
    });

    it("replaces the password with a new one on every press", async () => {
        const user = userEvent.setup();
        render(<FieldHarness initialPassword="" error={null}/>);
        const input = screen.getByLabelText(LINK_PASSWORD_COPY.INPUT_LABEL);
        if (!(input instanceof HTMLInputElement)) throw new Error("The password box is not an input");

        await user.click(screen.getByRole("button", {name: LINK_PASSWORD_COPY.GENERATE}));
        const firstPassword = input.value;
        await user.click(screen.getByRole("button", {name: LINK_PASSWORD_COPY.GENERATE}));

        expect(firstPassword).toMatch(GENERATED_PASSWORD_PATTERN);
        expect(input.value).toMatch(GENERATED_PASSWORD_PATTERN);
        expect(input.value).not.toBe(firstPassword);
    });
});
