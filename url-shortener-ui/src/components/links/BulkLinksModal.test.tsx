import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {BulkLinksModal} from "@/components/links/BulkLinksModal";
import {BULK_LINK_ACTION_COPY, LINK_SELECTION_COPY} from "@/lib/constants";
import {createLinkItem} from "@/test/link-utils";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

const LINKS = [
    createLinkItem({id: "a", shortUrl: "https://sho.rt/first"}),
    createLinkItem({id: "b", shortUrl: "https://sho.rt/second"}),
];

describe("BulkLinksModal", () => {
    it("lists the links and confirms a suspend without a typed phrase", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<BulkLinksModal open action="suspend" links={LINKS} onOpenChange={vi.fn()} onConfirm={onConfirm}/>);

        await user.click(screen.getByRole("button", {name: "Suspend links"}));

        expect(screen.getByText("Suspend 2 links?")).toBeInTheDocument();
        expect(screen.getByText(BULK_LINK_ACTION_COPY.suspend.DESCRIPTION)).toBeInTheDocument();
        expect(within(screen.getByRole("list", {name: LINK_SELECTION_COPY.LINK_LIST})).getAllByRole("listitem")).toHaveLength(2);
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("asks for the delete phrase before deleting", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<BulkLinksModal open action="delete" links={LINKS} onOpenChange={vi.fn()} onConfirm={onConfirm}/>);

        expect(screen.getByRole("button", {name: "Delete links"})).toBeDisabled();
        await user.type(screen.getByRole("textbox"), "delete 2 links");
        await user.click(screen.getByRole("button", {name: "Delete links"}));

        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("renders nothing without an action", () => {
        render(<BulkLinksModal open action={null} links={LINKS} onOpenChange={vi.fn()} onConfirm={vi.fn()}/>);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});
