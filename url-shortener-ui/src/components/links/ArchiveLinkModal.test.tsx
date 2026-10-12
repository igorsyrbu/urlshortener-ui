import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ArchiveLinkModal} from "@/components/links/ArchiveLinkModal";
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
])("ArchiveLinkModal on %s", (_viewport, isDesktop) => {
    beforeEach(() => { media.isDesktop = isDesktop; });

    it("offers to archive an active link without asking for a typed confirmation", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<ArchiveLinkModal open link={createLinkItem({isActive: true, shortUrl: SHORT_URL})} onOpenChange={vi.fn()} onConfirm={onConfirm}/>);

        await user.click(screen.getByRole("button", {name: "Archive link"}));

        expect(screen.getByText("Archive this link?")).toBeInTheDocument();
        expect(screen.getByText(/redirect visitors to the not-found page/)).toBeInTheDocument();
        expect(screen.getByText(SHORT_URL)).toBeInTheDocument();
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("offers to restore an archived link", () => {
        render(<ArchiveLinkModal open link={createLinkItem({isActive: false})} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.getByText("Unarchive this link?")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Unarchive link"})).toBeEnabled();
    });

    it.each([
        [true, "Archiving..."],
        [false, "Unarchiving..."],
    ])("shows the progress label while loading (isActive=%s)", (isActive, label) => {
        render(<ArchiveLinkModal open loading link={createLinkItem({isActive})} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.getByRole("button", {name: label})).toBeDisabled();
    });

    it("renders nothing without a link", () => {
        render(<ArchiveLinkModal open link={null} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
