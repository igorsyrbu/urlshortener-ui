import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi, type Mock} from "vitest";
import {LoginMagicLinkForm} from "@/components/auth/LoginMagicLinkForm";

type FormProps = Partial<Parameters<typeof LoginMagicLinkForm>[0]>;

function renderForm(props: FormProps = {}): {onSubmit: Mock; onEmailChange: Mock} {
    const onSubmit = vi.fn((event: {preventDefault: () => void}) => event.preventDefault());
    const onEmailChange = vi.fn();
    render(<LoginMagicLinkForm email="" loading={false} onEmailChange={onEmailChange} onSubmit={onSubmit} {...props}/>);
    return {onSubmit, onEmailChange};
}

describe("LoginMagicLinkForm", () => {
    it("reports every edit of the email", async () => {
        const user = userEvent.setup();
        const {onEmailChange} = renderForm();

        await user.type(screen.getByLabelText("Email address"), "ab");

        expect(onEmailChange).toHaveBeenNthCalledWith(1, "a");
        expect(onEmailChange).toHaveBeenNthCalledWith(2, "b");
    });

    it("submits the form when the button is pressed", async () => {
        const user = userEvent.setup();
        const {onSubmit} = renderForm({email: "user@example.com"});

        await user.click(screen.getByRole("button", {name: "Send magic link"}));

        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it("shows progress and locks the form while sending", () => {
        renderForm({loading: true});

        expect(screen.getByRole("button", {name: /Sending magic link\.\.\./})).toBeDisabled();
        expect(screen.getByLabelText("Email address")).toBeDisabled();
    });

    it("waits for the captcha before enabling the button", () => {
        renderForm({turnstileEnabled: true, turnstileSolved: false});

        expect(screen.getByRole("button", {name: /Verifying\.\.\./})).toBeDisabled();
    });

    it("enables the button once the captcha is solved", () => {
        renderForm({turnstileEnabled: true, turnstileSolved: true});

        expect(screen.getByRole("button", {name: "Send magic link"})).toBeEnabled();
    });

    it("ignores the captcha state when the captcha is disabled", () => {
        renderForm({turnstileEnabled: false, turnstileSolved: false});

        expect(screen.getByRole("button", {name: "Send magic link"})).toBeEnabled();
    });

    it("disables only the input when inputDisabled is set", () => {
        renderForm({inputDisabled: true});

        expect(screen.getByLabelText("Email address")).toBeDisabled();
        expect(screen.getByRole("button", {name: "Send magic link"})).toBeEnabled();
    });

    it("disables the button when buttonDisabled is set", () => {
        renderForm({buttonDisabled: true});

        expect(screen.getByRole("button", {name: "Send magic link"})).toBeDisabled();
    });
});
