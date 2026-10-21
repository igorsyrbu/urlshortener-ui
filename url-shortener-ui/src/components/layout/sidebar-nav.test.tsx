import type {ComponentProps, ReactElement} from "react";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {SidebarNav} from "@/components/layout/sidebar-nav";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

const navigation = vi.hoisted(() => ({pathname: "/", isLinkPending: false}));

vi.mock("next/navigation", () => ({usePathname: () => navigation.pathname}));
vi.mock("next/link", () => ({
    default: ({href, onClick, children, ...rest}: ComponentProps<"a"> & {href: string}): ReactElement => (
        <a href={href} onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
        }} {...rest}>{children}</a>
    ),
    useLinkStatus: () => ({pending: navigation.isLinkPending}),
}));

const NAV_ITEMS = [
    {name: "Dashboard", href: "/dashboard"},
    {name: "Links", href: "/links"},
    {name: "Analytics", href: "/analytics"},
    {name: "Tags", href: "/tags"},
    {name: "Settings", href: SETTINGS_ROUTES.DEFAULT},
];

function isHighlighted(link: HTMLElement): boolean {
    return link.querySelector("span")?.classList.contains("font-bold") ?? false;
}

function renderAt(pathname: string, onNavigate?: () => void): void {
    navigation.pathname = pathname;
    render(<SidebarNav onNavigate={onNavigate}/>);
}

describe("SidebarNav", () => {
    it.each(NAV_ITEMS)("links $name to $href", ({name, href}) => {
        renderAt("/");

        expect(screen.getByRole("link", {name})).toHaveAttribute("href", href);
    });

    it.each(NAV_ITEMS)("highlights only $name on $href", ({name, href}) => {
        renderAt(href);

        const highlighted = screen.getAllByRole("link").filter(isHighlighted);
        expect(highlighted.map((link) => link.textContent)).toEqual([name]);
    });

    it.each([SETTINGS_ROUTES.GENERAL, SETTINGS_ROUTES.BILLING])("keeps Settings highlighted on %s", (pathname) => {
        renderAt(pathname);

        expect(isHighlighted(screen.getByRole("link", {name: "Settings"}))).toBe(true);
    });

    it("keeps a section highlighted on its nested routes", () => {
        renderAt("/links/abc123/details");

        expect(isHighlighted(screen.getByRole("link", {name: "Links"}))).toBe(true);
    });

    it("marks only the current section with aria-current", () => {
        navigation.pathname = "/settings/billing";
        render(<SidebarNav/>);

        expect(screen.getByRole("link", {name: /Settings/, current: "page"})).toBeInTheDocument();
        expect(screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")).toHaveLength(1);
    });

    it("does not highlight a section whose name merely prefixes the current route", () => {
        renderAt("/linksfoo");

        expect(screen.getAllByRole("link").filter(isHighlighted)).toHaveLength(0);
    });

    it.each(Object.values(SETTINGS_ROUTES))("keeps Settings highlighted on %s", (pathname) => {
        renderAt(pathname);

        expect(isHighlighted(screen.getByRole("link", {name: "Settings"}))).toBe(true);
    });

    it("highlights nothing on an unknown route", () => {
        renderAt("/somewhere-else");

        expect(screen.getAllByRole("link").filter(isHighlighted)).toHaveLength(0);
    });

    it("notifies the parent when a link is followed", async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();
        renderAt("/", onNavigate);

        await user.click(screen.getByRole("link", {name: "Tags"}));

        expect(onNavigate).toHaveBeenCalledOnce();
    });

    it.each([
        {isLinkPending: false, state: "idle"},
        {isLinkPending: true, state: "pending"},
    ])("shows the pending marker in each item only while its navigation is pending ($state)", ({isLinkPending, state}) => {
        navigation.isLinkPending = isLinkPending;
        renderAt("/");

        for (const link of screen.getAllByRole("link")) {
            expect(link.querySelector("[data-state]")).toHaveAttribute("data-state", state);
        }
        navigation.isLinkPending = false;
    });
});
