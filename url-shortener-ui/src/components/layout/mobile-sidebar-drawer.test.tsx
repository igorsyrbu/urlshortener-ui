import type {ComponentProps, ReactElement} from "react";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MobileSidebarDrawer} from "@/components/layout/mobile-sidebar-drawer";
import {LARGE_SCREEN_MIN_WIDTH_PX} from "@/lib/constants";
import {useAuthStore} from "@/lib/store/auth";

vi.mock("next/navigation", () => ({
    usePathname: () => "/",
    useRouter: () => ({push: vi.fn(), replace: vi.fn()}),
}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => false, useIsMobile: () => true}));
vi.mock("next/link", () => ({
    default: ({href, onClick, children, ...rest}: ComponentProps<"a"> & {href: string}): ReactElement => (
        <a href={href} onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
        }} {...rest}>{children}</a>
    ),
    useLinkStatus: () => ({pending: false}),
}));

type MediaChangeListener = () => void;

interface ControlledMediaQuery {
    setMatches: (matches: boolean) => void;
}

function controlLargeScreenQuery(initiallyMatches: boolean): ControlledMediaQuery {
    const listeners = new Set<MediaChangeListener>();
    const state = {matches: initiallyMatches};
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
        get matches(): boolean {
            return query === `(min-width: ${LARGE_SCREEN_MIN_WIDTH_PX}px)` && state.matches;
        },
        media: query,
        addEventListener: (_type: string, listener: MediaChangeListener) => listeners.add(listener),
        removeEventListener: (_type: string, listener: MediaChangeListener) => listeners.delete(listener),
    }) as unknown as MediaQueryList);
    return {
        setMatches: (matches) => {
            state.matches = matches;
            listeners.forEach((listener) => listener());
        },
    };
}

describe("MobileSidebarDrawer", () => {
    beforeEach(() => {
        useAuthStore.setState({user: {email: "ada@example.com", name: "Ada"}});
    });

    it("shows the navigation links while open", () => {
        controlLargeScreenQuery(false);
        render(<MobileSidebarDrawer open onOpenChange={vi.fn()}/>);

        expect(screen.getByRole("dialog", {name: "Main navigation"})).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Links"})).toBeInTheDocument();
    });

    it("renders nothing while closed", () => {
        controlLargeScreenQuery(false);
        render(<MobileSidebarDrawer open={false} onOpenChange={vi.fn()}/>);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes after a navigation link is followed", async () => {
        const user = userEvent.setup();
        controlLargeScreenQuery(false);
        const onOpenChange = vi.fn();
        render(<MobileSidebarDrawer open onOpenChange={onOpenChange}/>);

        await user.click(screen.getByRole("link", {name: "Tags"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes when dismissed with Escape", async () => {
        const user = userEvent.setup();
        controlLargeScreenQuery(false);
        const onOpenChange = vi.fn();
        render(<MobileSidebarDrawer open onOpenChange={onOpenChange}/>);

        await user.keyboard("{Escape}");

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes right away when mounted on a large screen", () => {
        controlLargeScreenQuery(true);
        const onOpenChange = vi.fn();

        render(<MobileSidebarDrawer open onOpenChange={onOpenChange}/>);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes when the viewport grows to a large screen", () => {
        const viewport = controlLargeScreenQuery(false);
        const onOpenChange = vi.fn();
        render(<MobileSidebarDrawer open onOpenChange={onOpenChange}/>);
        expect(onOpenChange).not.toHaveBeenCalled();

        viewport.setMatches(true);

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
