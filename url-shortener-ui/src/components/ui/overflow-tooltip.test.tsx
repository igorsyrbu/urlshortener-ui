import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {OverflowTooltip} from "@/components/ui/overflow-tooltip";

const LONG_VALUE = "https://example.com/".concat("segment/".repeat(4));

function stubTextWidths(scrollWidth: number, clientWidth: number): void {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
}

describe("OverflowTooltip", () => {
    it("shows the full value as text", () => {
        render(<OverflowTooltip value={LONG_VALUE}/>);

        expect(screen.getByText(LONG_VALUE)).toBeInTheDocument();
    });

    it("shows a tooltip with the full value when the text is truncated", async () => {
        const user = userEvent.setup();
        stubTextWidths(400, 100);
        render(<OverflowTooltip value={LONG_VALUE}/>);

        await user.hover(screen.getByText(LONG_VALUE));

        expect(await screen.findByRole("tooltip")).toHaveTextContent(LONG_VALUE);
    });

    it("shows no tooltip when the text fits", async () => {
        const user = userEvent.setup();
        stubTextWidths(100, 100);
        render(<OverflowTooltip value="short"/>);

        await user.hover(screen.getByText("short"));

        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("closes the tooltip when dismissed with Escape", async () => {
        const user = userEvent.setup();
        stubTextWidths(400, 100);
        render(<OverflowTooltip value={LONG_VALUE}/>);
        const text = screen.getByText(LONG_VALUE);
        await user.hover(text);
        await screen.findByRole("tooltip");

        await user.keyboard("{Escape}");

        await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    });
});
