import {render, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import Home from "@/app/page";
import {INSPECT_FORM_COPY, LANDING_COPY, LANDING_FEATURES} from "@/components/landing/landing-copy";
import {APP_NAME, ROUTES} from "@/lib/constants";

function hrefsOfLinksNamed(name: string): (string | null)[] {
    return screen.getAllByRole("link", {name}).map((link) => link.getAttribute("href"));
}

describe("Home (development landing page)", () => {
    it("names the app and links its brand to the landing page", () => {
        render(<Home/>);

        expect(within(screen.getByRole("banner")).getByRole("link", {name: APP_NAME})).toHaveAttribute("href", ROUTES.HOME);
        expect(screen.getByRole("heading", {level: 1, name: LANDING_COPY.HEADLINE})).toBeInTheDocument();
    });

    it("leads to sign-in from the header and the hero", () => {
        render(<Home/>);

        expect(hrefsOfLinksNamed(LANDING_COPY.SIGN_IN)).toEqual([ROUTES.LOGIN, ROUTES.LOGIN]);
    });

    it("leads to the app, where signed-out visitors are sent to sign in", () => {
        render(<Home/>);

        const hrefs = hrefsOfLinksNamed(LANDING_COPY.OPEN_APP);
        expect(hrefs.length).toBeGreaterThan(0);
        expect(new Set(hrefs)).toEqual(new Set([ROUTES.LINKS]));
    });

    it("leads to the abuse report form", () => {
        render(<Home/>);

        expect(new Set(hrefsOfLinksNamed(LANDING_COPY.REPORT_ACTION))).toEqual(new Set([ROUTES.REPORT_ABUSE]));
    });

    it("offers to inspect a short link", () => {
        render(<Home/>);

        expect(screen.getByRole("heading", {name: LANDING_COPY.INSPECT_TITLE})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: INSPECT_FORM_COPY.SUBMIT})).toBeInTheDocument();
    });

    it("lists what the app does", () => {
        render(<Home/>);

        const features = within(screen.getByRole("region", {name: LANDING_COPY.FEATURES_LABEL})).getAllByRole("listitem");
        expect(features.map((item) => item.textContent)).toEqual(LANDING_FEATURES.map(({title, description}) => `${title}${description}`));
    });

    it("hides the decorative example cards from assistive technology", () => {
        render(<Home/>);

        expect(screen.getByText("sho.rt/launch").closest("[aria-hidden='true']")).not.toBeNull();
    });
});
