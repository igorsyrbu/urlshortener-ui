import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {SuspendLinkModal} from "@/components/links/SuspendLinkModal";
import {createLinkItem} from "@/test/link-utils";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));

const SHORT_URL = "https://sho.rt/promo-2026";

describe.each([
    ["desktop", true],
    ["mobile", false],
])("SuspendLinkModal on %s", (_viewport, isDesktop) => {
    beforeEach(() => { media.isDesktop = isDesktop; });

    it("offers to suspend an active link without asking for a typed confirmation", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<SuspendLinkModal open link={createLinkItem({isSuspended: false, shortUrl: SHORT_URL})} onOpenChange={vi.fn()} onConfirm={onConfirm}/>);

        await user.click(screen.getByRole("button", {name: "Suspend link"}));

        expect(screen.getByText("Suspend this link?")).toBeInTheDocument();
        expect(screen.getByText(/show visitors a suspended page/)).toBeInTheDocument();
        expect(screen.getByText(SHORT_URL)).toBeInTheDocument();
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("offers to resume a suspended link", () => {
        render(<SuspendLinkModal open link={createLinkItem({isSuspended: true})} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.getByText("Resume this link?")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Resume link"})).toBeEnabled();
    });

    it.each([
        [false, "Suspending..."],
        [true, "Resuming..."],
    ])("shows the progress label while loading (isSuspended=%s)", (isSuspended, label) => {
        render(<SuspendLinkModal open loading link={createLinkItem({isSuspended})} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.getByRole("button", {name: label})).toBeDisabled();
    });

    it("renders nothing without a link", () => {
        render(<SuspendLinkModal open link={null} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
