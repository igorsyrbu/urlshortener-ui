import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {LinksSelectionBar} from "@/components/links/LinksSelectionBar";
import {LINK_SELECTION_COPY} from "@/lib/constants";
import {createLinkItem} from "@/test/link-utils";
import type {LinkItem} from "@/lib/types";

function renderBar(selectedLinks: LinkItem[]) {
    const onClear = vi.fn();
    const onAction = vi.fn();
    render(<LinksSelectionBar selectedLinks={selectedLinks} onClear={onClear} onAction={onAction}/>);
    return {onClear, onAction};
}

describe("LinksSelectionBar", () => {
    it("shows how many links are selected and runs the chosen action", async () => {
        const user = userEvent.setup();
        const {onAction} = renderBar([createLinkItem({id: "a"}), createLinkItem({id: "b"})]);

        await user.click(screen.getByRole("button", {name: /Archive/}));
        await user.click(screen.getByRole("button", {name: /Suspend/}));
        await user.click(screen.getByRole("button", {name: /Delete/}));

        expect(screen.getByText(LINK_SELECTION_COPY.SELECTED(2))).toBeInTheDocument();
        expect(onAction.mock.calls).toEqual([["archive"], ["suspend"], ["delete"]]);
    });

    it("offers unarchive and resume when every selected link is archived and suspended", () => {
        renderBar([createLinkItem({isActive: false, isSuspended: true})]);

        expect(screen.getByRole("button", {name: /Unarchive/})).toHaveAttribute("aria-keyshortcuts", "A");
        expect(screen.getByRole("button", {name: /Resume/})).toHaveAttribute("aria-keyshortcuts", "S");
    });

    it("shows only the count and clear while no link is picked yet", () => {
        renderBar([]);

        expect(screen.getByText(LINK_SELECTION_COPY.SELECTED(0))).toBeInTheDocument();
        expect(screen.getAllByRole("button")).toEqual([screen.getByRole("button", {name: LINK_SELECTION_COPY.CLEAR})]);
    });

    it("clears the selection", async () => {
        const user = userEvent.setup();
        const {onClear} = renderBar([createLinkItem()]);

        await user.click(screen.getByRole("button", {name: LINK_SELECTION_COPY.CLEAR}));

        expect(onClear).toHaveBeenCalledOnce();
    });
});
