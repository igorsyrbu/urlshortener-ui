import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {CreateLinkSuccess} from "@/components/links/CreateLinkSuccess";
import {logger} from "@/lib/logger";

const SHORT_URL = "https://sho.rt/abc123";

function renderSuccess(): {onClose: ReturnType<typeof vi.fn<() => void>>} {
    const onClose = vi.fn<() => void>();
    render(<CreateLinkSuccess shortUrl={SHORT_URL} onClose={onClose}/>);
    return {onClose};
}

describe("CreateLinkSuccess", () => {
    it("announces the created link and shows its short URL read-only", () => {
        renderSuccess();

        expect(screen.getByText("Link Created!")).toBeInTheDocument();
        expect(screen.getByDisplayValue(SHORT_URL)).toHaveAttribute("readonly");
    });

    it("copies the short URL to the clipboard", async () => {
        const user = userEvent.setup();
        renderSuccess();

        await user.click(screen.getByRole("button", {name: "Copy to clipboard"}));

        expect(await navigator.clipboard.readText()).toBe(SHORT_URL);
    });

    it("logs the failure when the clipboard rejects the write", async () => {
        const user = userEvent.setup();
        const clipboardError = new Error("denied");
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(clipboardError);
        const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);
        renderSuccess();

        await user.click(screen.getByRole("button", {name: "Copy to clipboard"}));

        expect(logError).toHaveBeenCalledWith("Failed to copy", clipboardError);
    });

    it("closes with the done button", async () => {
        const user = userEvent.setup();
        const {onClose} = renderSuccess();

        await user.click(screen.getByRole("button", {name: "Done"}));

        expect(onClose).toHaveBeenCalledOnce();
    });
});
