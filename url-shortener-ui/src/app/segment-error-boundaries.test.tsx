import type {ComponentType} from "react";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import type {BoundaryErrorProps} from "@/components/layout/ErrorView";
import {logger} from "@/lib/logger";
import GlobalError from "./global-error";
import AuthError from "./auth/error";
import InspectError from "./inspect/[key]/error";
import LegalError from "./(legal)/error";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const boundaries: [string, ComponentType<BoundaryErrorProps>, string, string][] = [
    ["global", GlobalError, "Something went wrong!", "Global boundary caught error"],
    ["sign-in", AuthError, "Sign-in could not finish", "Sign-in boundary caught error"],
    ["inspect", InspectError, "Preview unavailable", "Inspect boundary caught error"],
    ["legal", LegalError, "This page could not load", "Legal pages boundary caught error"],
];

describe.each(boundaries)("%s error boundary", (_name, Boundary, heading, logMessage) => {
    it("explains the failure without exposing the error message", () => {
        render(<Boundary error={new Error("HTTP 500 secret detail")} reset={vi.fn()}/>);

        expect(screen.getByRole("heading", {name: heading})).toBeInTheDocument();
        expect(screen.queryByText(/secret detail|500/)).not.toBeInTheDocument();
    });

    it("logs the error with its digest", () => {
        const error = Object.assign(new Error("boom"), {digest: "digest-3"});

        render(<Boundary error={error} reset={vi.fn()}/>);

        expect(logger.error).toHaveBeenCalledWith(logMessage, error, {digest: "digest-3"});
    });

    it("retries when the user presses Try again", async () => {
        const user = userEvent.setup();
        const reset = vi.fn();
        render(<Boundary error={new Error("boom")} reset={reset}/>);

        await user.click(screen.getByRole("button", {name: "Try again"}));

        expect(reset).toHaveBeenCalledOnce();
    });
});
