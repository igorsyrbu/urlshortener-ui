import {render} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {LinkPendingIndicator} from "@/components/ui/link-pending-indicator";

const linkStatus = vi.hoisted(() => ({pending: false}));

vi.mock("next/link", () => ({useLinkStatus: () => linkStatus}));

describe("LinkPendingIndicator", () => {
    it.each([
        {pending: false, state: "idle"},
        {pending: true, state: "pending"},
    ])("reflects the link's navigation status ($state)", ({pending, state}) => {
        linkStatus.pending = pending;

        const {container} = render(<LinkPendingIndicator/>);

        expect(container.firstElementChild).toHaveAttribute("data-state", state);
        expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    });
});
