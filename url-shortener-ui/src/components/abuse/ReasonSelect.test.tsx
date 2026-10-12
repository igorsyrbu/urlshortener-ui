import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ReasonSelect} from "@/components/abuse/ReasonSelect";
import {ABUSE_REASON_LABELS, ABUSE_REASONS} from "@/lib/constants";

describe("ReasonSelect", () => {
    it("shows a placeholder until a reason is chosen", () => {
        render(<ReasonSelect value="" onChange={vi.fn()}/>);

        expect(screen.getByRole("combobox")).toHaveTextContent("Select a reason");
    });

    it("shows the label of the chosen reason", () => {
        render(<ReasonSelect value="PHISHING_OR_MALWARE" onChange={vi.fn()}/>);

        expect(screen.getByRole("combobox")).toHaveTextContent(ABUSE_REASON_LABELS.PHISHING_OR_MALWARE);
    });

    it("lists every abuse reason", async () => {
        const user = userEvent.setup();
        render(<ReasonSelect value="" onChange={vi.fn()}/>);

        await user.click(screen.getByRole("combobox"));

        expect(await screen.findAllByRole("option")).toHaveLength(ABUSE_REASONS.length);
    });

    it("reports the reason code of the selected option", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<ReasonSelect value="" onChange={onChange}/>);

        await user.click(screen.getByRole("combobox"));
        await user.click(await screen.findByRole("option", {name: ABUSE_REASON_LABELS.IMPERSONATION}));

        expect(onChange).toHaveBeenCalledExactlyOnceWith("IMPERSONATION");
    });
});
