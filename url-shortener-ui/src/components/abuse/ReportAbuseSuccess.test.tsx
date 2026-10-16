import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {toast} from "sonner";
import {ReportAbuseSuccess} from "@/components/abuse/ReportAbuseSuccess";
import {COPY_FAILED_MESSAGE, COPY_FEEDBACK_DURATION_MS, REPORT_ID_LABEL} from "@/lib/constants";

const REPORT_ID = "report-42";

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

    it("confirms the report was received and shows its labelled id", () => {
        renderSuccess();

        expect(screen.getByText("Report received")).toBeInTheDocument();
        expect(screen.getByText(`${REPORT_ID_LABEL}:`, {exact: false})).toHaveTextContent(`${REPORT_ID_LABEL}: ${REPORT_ID}`);
    });

    it("keeps the copy label and shows an error toast when copying fails", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        const showError = vi.spyOn(toast, "error");
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
        renderSuccess();

        await user.click(screen.getByRole("button", {name: "Copy report ID"}));

        expect(showError).toHaveBeenCalledExactlyOnceWith(COPY_FAILED_MESSAGE);
        expect(screen.getByRole("button", {name: "Copy report ID"})).toBeInTheDocument();
    });

    it("copies the report id and reverts the button label after a short while", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        renderSuccess();

        await user.click(screen.getByRole("button", {name: "Copy report ID"}));

        expect(await navigator.clipboard.readText()).toBe(REPORT_ID);
        expect(screen.getByRole("button", {name: "Copied"})).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(COPY_FEEDBACK_DURATION_MS);
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
