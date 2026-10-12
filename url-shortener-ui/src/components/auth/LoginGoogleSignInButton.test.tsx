import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {LoginGoogleSignInButton} from "@/components/auth/LoginGoogleSignInButton";

describe("LoginGoogleSignInButton", () => {
    it("starts the Google sign-in when pressed", async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<LoginGoogleSignInButton onClick={onClick}/>);

        await user.click(screen.getByRole("button", {name: "Sign in with Google"}));

        expect(onClick).toHaveBeenCalledOnce();
    });
});
