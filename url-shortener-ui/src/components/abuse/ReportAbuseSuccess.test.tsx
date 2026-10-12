import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ReportAbuseSuccess} from "@/components/abuse/ReportAbuseSuccess";

const REPORT_ID = "report-42";
const COPY_FEEDBACK_MS = 2000;

function renderSuccess(onReset = vi.fn()): void {
    render(<ReportAbuseSuccess reportId={REPORT_ID} shortUrl="https://sho.rt/abc" onReset={onReset}/>);
}

describe("ReportAbuseSuccess", () => {
    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("confirms the report was received and shows its id", () => {
        renderSuccess();

        expect(screen.getByText("Report received")).toBeInTheDocument();
        expect(screen.getByText(new RegExp(REPORT_ID))).toBeInTheDocument();
    });

    it("copies the report id and reverts the button label after a short while", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        renderSuccess();

        await user.click(screen.getByRole("button", {name: "Copy report ID"}));

        expect(await navigator.clipboard.readText()).toBe(REPORT_ID);
        expect(screen.getByRole("button", {name: "Copied"})).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(COPY_FEEDBACK_MS);
        });
        expect(screen.getByRole("button", {name: "Copy report ID"})).toBeInTheDocument();
    });

    it("lets the user report another link", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        const onReset = vi.fn();
        renderSuccess(onReset);

        await user.click(screen.getByRole("button", {name: "Report another link"}));

        expect(onReset).toHaveBeenCalledOnce();
    });
});
