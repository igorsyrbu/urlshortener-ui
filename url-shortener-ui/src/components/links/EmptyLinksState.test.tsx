import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it} from "vitest";
import {EmptyLinksState} from "@/components/links/EmptyLinksState";
import {useUIStore} from "@/lib/store/ui";

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
});
