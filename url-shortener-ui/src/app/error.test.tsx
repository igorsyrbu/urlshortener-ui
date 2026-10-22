import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import RootError from "./error";
import {logger} from "@/lib/logger";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

describe("root error boundary", () => {
    it("tells the user something went wrong", () => {
        render(<RootError error={new Error("boom")} reset={vi.fn()}/>);

        expect(screen.getByRole("heading", {name: "Something went wrong!"})).toBeInTheDocument();
    });

    it("does not expose the error message to the user", () => {
        render(<RootError error={new Error("secret stack detail")} reset={vi.fn()}/>);

        expect(screen.queryByText(/secret stack detail/)).not.toBeInTheDocument();
    });

    it("logs the error with its digest", () => {
        const error = Object.assign(new Error("boom"), {digest: "digest-1"});

        render(<RootError error={error} reset={vi.fn()}/>);

        expect(logger.error).toHaveBeenCalledExactlyOnceWith("Root boundary caught error", error, {digest: "digest-1"});
    });

    it("retries when the user presses Try again", async () => {
        const user = userEvent.setup();
        const reset = vi.fn();
        render(<RootError error={new Error("boom")} reset={reset}/>);

        await user.click(screen.getByRole("button", {name: "Try again"}));

        expect(reset).toHaveBeenCalledOnce();
    });
});
