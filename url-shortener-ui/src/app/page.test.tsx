import {render, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import Home from "@/app/page";
import {LANDING_COPY} from "@/components/landing/landing-copy";
import {APP_NAME, ROUTES} from "@/lib/constants";

function linkNamed(name: string, container: HTMLElement = document.body): HTMLElement[] {
    return within(container).getAllByRole("link", {name});
}

describe("Home (development landing page)", () => {
    it("names the app and links its brand to the landing page", () => {
        render(<Home/>);

        expect(screen.getByRole("link", {name: APP_NAME})).toHaveAttribute("href", ROUTES.HOME);
        expect(screen.getByRole("heading", {level: 1, name: LANDING_COPY.HEADLINE})).toBeInTheDocument();
    });

    it("leads to sign-in from the header and the hero", () => {
        render(<Home/>);

        const signInLinks = linkNamed(LANDING_COPY.SIGN_IN);
        expect(signInLinks).toHaveLength(2);
        for (const link of signInLinks) expect(link).toHaveAttribute("href", ROUTES.LOGIN);
    });

    it("leads to the app, where signed-out visitors are sent to sign in", () => {
        render(<Home/>);

        for (const link of linkNamed(LANDING_COPY.OPEN_APP)) expect(link).toHaveAttribute("href", ROUTES.LINKS);
    });

    it("leads to the abuse report form", () => {
        render(<Home/>);

        expect(screen.getByRole("link", {name: LANDING_COPY.REPORT_ACTION})).toHaveAttribute("href", ROUTES.REPORT_ABUSE);
    });

    it("offers to inspect a short link", () => {
        render(<Home/>);

        expect(screen.getByRole("heading", {name: LANDING_COPY.INSPECT_TITLE})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Inspect"})).toBeInTheDocument();
    });
});
