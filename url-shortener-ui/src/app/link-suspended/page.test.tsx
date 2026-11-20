import {render, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import LinkSuspendedPage from "./page";
import {APP_NAME, LINK_SUSPENDED_COPY, ROUTES} from "@/lib/constants";

describe("link suspended page", () => {
    it("tells the visitor that the link is suspended", () => {
        render(<LinkSuspendedPage/>);

        expect(screen.getByRole("heading", {name: LINK_SUSPENDED_COPY.PAGE_HEADING})).toBeInTheDocument();
        expect(screen.getByText(LINK_SUSPENDED_COPY.PAGE_DESCRIPTION)).toBeInTheDocument();
    });

    it("links to the home page", () => {
        render(<LinkSuspendedPage/>);

        expect(screen.getByRole("link", {name: LINK_SUSPENDED_COPY.HOME})).toHaveAttribute("href", ROUTES.HOME);
        expect(within(screen.getByRole("contentinfo")).getByRole("link", {name: APP_NAME})).toHaveAttribute("href", ROUTES.HOME);
    });
});
