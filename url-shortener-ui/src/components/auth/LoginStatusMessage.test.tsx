import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {LoginStatusMessage} from "@/components/auth/LoginStatusMessage";

describe("LoginStatusMessage", () => {
    it("renders nothing without a message", () => {
        const {container} = render(<LoginStatusMessage message={null}/>);

        expect(container).toBeEmptyDOMElement();
    });

    it("shows a success message with a check mark", () => {
        render(<LoginStatusMessage message={{type: "success", text: "Magic link sent"}}/>);

        expect(screen.getByText(/✓\s*Magic link sent/)).toBeInTheDocument();
    });

    it("shows an error message with a cross mark", () => {
        render(<LoginStatusMessage message={{type: "error", text: "Invalid code"}}/>);

        expect(screen.getByText(/✗\s*Invalid code/)).toBeInTheDocument();
    });
});
