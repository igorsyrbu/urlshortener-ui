import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it} from "vitest";
import {EmptyLinksState} from "@/components/links/EmptyLinksState";
import {useUIStore} from "@/lib/store/ui";
import {EMPTY_STATE_SCROLL_ROW_COUNT} from "@/lib/constants";

describe("EmptyLinksState", () => {
    beforeEach(() => { useUIStore.setState({isCreateModalOpen: false}); });

    it("invites the user to create the first link", () => {
        render(<EmptyLinksState/>);

        expect(screen.getByRole("heading", {name: "Your links will live here"})).toBeInTheDocument();
    });

    it("opens the create link modal from the call to action", async () => {
        const user = userEvent.setup();
        render(<EmptyLinksState/>);

        await user.click(screen.getByRole("button", {name: "Create Link"}));

        expect(useUIStore.getState().isCreateModalOpen).toBe(true);
    });

    it("keeps the decorative rows few and hidden from assistive technology", () => {
        const {container} = render(<EmptyLinksState/>);

        const decoration = container.querySelector("[aria-hidden='true']");
        const rows = decoration?.querySelectorAll(".animate-vertical-scroll > div > div") ?? [];

        expect(rows).toHaveLength(EMPTY_STATE_SCROLL_ROW_COUNT * 2);
        expect(screen.getAllByRole("button")).toHaveLength(1);
    });
});
