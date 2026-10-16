import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {SettingsTabs} from "@/components/settings/SettingsTabs";
import {SETTINGS_LABELS, SETTINGS_ROUTES, SETTINGS_SECTIONS} from "@/lib/settings-constants";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

const navigation = vi.hoisted(() => ({pathname: "/settings/general"}));
vi.mock("next/navigation", () => ({usePathname: () => navigation.pathname}));

function settingsNavigation(): HTMLElement {
    return screen.getByRole("navigation", {name: SETTINGS_LABELS.NAVIGATION});
}

describe.each([
    {layout: "desktop", stubViewport: stubDesktopViewport},
    {layout: "mobile", stubViewport: stubMobileViewport},
])("SettingsTabs $layout routes", ({stubViewport}) => {
    beforeEach(() => {
        stubViewport();
        navigation.pathname = SETTINGS_ROUTES.GENERAL;
    });

    it("places Billing after General", () => {
        render(<SettingsTabs/>);

        expect(within(settingsNavigation()).getAllByRole("link").map((link) => link.textContent)).toEqual([
            SETTINGS_LABELS.GENERAL, SETTINGS_LABELS.BILLING,
        ]);
    });

    it.each(SETTINGS_SECTIONS)("links $label to $href", ({href, label}) => {
        render(<SettingsTabs/>);

        expect(within(settingsNavigation()).getByRole("link", {name: label})).toHaveAttribute("href", href);
    });

    it.each(SETTINGS_SECTIONS)("marks only $label as current on its own route", ({href, label}) => {
        navigation.pathname = href;

        render(<SettingsTabs/>);

        const currentLinks = within(settingsNavigation()).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
        expect(currentLinks).toHaveLength(1);
        expect(currentLinks[0]).toHaveTextContent(label);
    });

    it("follows the current route when navigating back to another section", () => {
        navigation.pathname = SETTINGS_ROUTES.BILLING;
        const {rerender} = render(<SettingsTabs/>);

        navigation.pathname = SETTINGS_ROUTES.GENERAL;
        rerender(<SettingsTabs/>);

        expect(screen.getByRole("link", {name: SETTINGS_LABELS.GENERAL})).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", {name: SETTINGS_LABELS.BILLING})).not.toHaveAttribute("aria-current");
    });

    it("supports focusing each section with the keyboard", async () => {
        const user = userEvent.setup();
        render(<SettingsTabs/>);

        for (const section of SETTINGS_SECTIONS) {
            await user.tab();
            expect(screen.getByRole("link", {name: section.label})).toHaveFocus();
        }
    });

    it("keeps the current section selected when another section is hovered", async () => {
        const user = userEvent.setup();
        render(<SettingsTabs/>);

        await user.hover(screen.getByRole("link", {name: SETTINGS_LABELS.BILLING}));

        expect(screen.getByRole("link", {name: SETTINGS_LABELS.GENERAL})).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", {name: SETTINGS_LABELS.BILLING})).not.toHaveAttribute("aria-current");
    });
});
