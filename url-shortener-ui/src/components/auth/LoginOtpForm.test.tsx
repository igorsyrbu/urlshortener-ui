import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState, type ReactElement} from "react";
import {describe, expect, it, vi} from "vitest";
import {LoginOtpForm} from "@/components/auth/LoginOtpForm";

const EMAIL = "user@example.com";
const OTP_LENGTH = 6;
const FULL_CODE = "AB12CD";

interface HarnessProps {
    loading?: boolean;
    initialCode?: string;
    onSubmit: (code?: string) => void;
    onChangeEmail: () => void;
}

function Harness({loading = false, initialCode = "", onSubmit, onChangeEmail}: HarnessProps): ReactElement {
    const [code, setCode] = useState(initialCode);
    return (
        <LoginOtpForm email={EMAIL} code={code} loading={loading} onCodeChange={setCode} onSubmit={onSubmit}
                      onChangeEmail={onChangeEmail}/>
    );
}

interface RenderedForm {
    onSubmit: ReturnType<typeof vi.fn<(code?: string) => void>>;
    onChangeEmail: ReturnType<typeof vi.fn<() => void>>;
}

function renderForm(props: {loading?: boolean; initialCode?: string} = {}): RenderedForm {
    const onSubmit = vi.fn<(code?: string) => void>();
    const onChangeEmail = vi.fn<() => void>();
    render(<Harness {...props} onSubmit={onSubmit} onChangeEmail={onChangeEmail}/>);
    return {onSubmit, onChangeEmail};
}

function getCodeInput(): HTMLElement {
    return screen.getByLabelText("Verification code");
}

describe("LoginOtpForm", () => {
    it("shows the email the code was sent to as read only", () => {
        renderForm();

        expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
        expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    });

    it("lets the user go back to change the email", async () => {
        const user = userEvent.setup();
        const {onChangeEmail} = renderForm();

        await user.click(screen.getByRole("button", {name: "Change email address"}));

        expect(onChangeEmail).toHaveBeenCalledOnce();
    });

    it("keeps Continue disabled until all digits are entered", async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(getCodeInput(), FULL_CODE.slice(0, OTP_LENGTH - 1));

        expect(screen.getByRole("button", {name: "Continue"})).toBeDisabled();
    });

    it("submits the entered code when Continue is pressed", async () => {
        const user = userEvent.setup();
        const {onSubmit} = renderForm();

        await user.type(getCodeInput(), FULL_CODE);
        await user.click(screen.getByRole("button", {name: "Continue"}));

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith(FULL_CODE);
    });

    it("does not submit by itself when the code is typed one character at a time", async () => {
        const user = userEvent.setup();
        const {onSubmit} = renderForm();

        await user.type(getCodeInput(), FULL_CODE);

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("submits automatically when a complete code is pasted", async () => {
        const user = userEvent.setup();
        const {onSubmit} = renderForm();

        await user.click(getCodeInput());
        await user.paste(FULL_CODE);

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith(FULL_CODE);
    });

    it("does not submit a pasted code that is incomplete", async () => {
        const user = userEvent.setup();
        const {onSubmit} = renderForm();

        await user.click(getCodeInput());
        await user.paste("AB1");

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("rejects characters that are not letters or digits", async () => {
        const user = userEvent.setup();
        renderForm();

        await user.type(getCodeInput(), "A-B!1");

        expect(getCodeInput()).toHaveValue("AB1");
    });

    it("disables every control and shows progress while verifying", () => {
        renderForm({loading: true, initialCode: FULL_CODE});

        expect(screen.getByRole("button", {name: /Verifying\.\.\./})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Change email address"})).toBeDisabled();
        expect(getCodeInput()).toBeDisabled();
    });
});
