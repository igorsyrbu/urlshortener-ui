import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import DashboardError from "./error";
import {logger} from "@/lib/logger";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

describe("dashboard error boundary", () => {
    it("tells the user the section failed to load", () => {
        render(<DashboardError error={new Error("boom")} reset={vi.fn()}/>);

        expect(screen.getByRole("heading", {name: "Failed to load content"})).toBeInTheDocument();
    });

    it("logs the error with its digest", () => {
        const error = Object.assign(new Error("boom"), {digest: "digest-2"});

        render(<DashboardError error={error} reset={vi.fn()}/>);

        expect(logger.error).toHaveBeenCalledExactlyOnceWith("Dashboard boundary caught error", error, {digest: "digest-2"});
    });

    it("logs again when a different error is caught", () => {
        const {rerender} = render(<DashboardError error={new Error("first")} reset={vi.fn()}/>);

        rerender(<DashboardError error={new Error("second")} reset={vi.fn()}/>);

        expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it("retries when the user presses Try again", async () => {
        const user = userEvent.setup();
        const reset = vi.fn();
        render(<DashboardError error={new Error("boom")} reset={reset}/>);

        await user.click(screen.getByRole("button", {name: "Try again"}));

        expect(reset).toHaveBeenCalledOnce();
    });
});
