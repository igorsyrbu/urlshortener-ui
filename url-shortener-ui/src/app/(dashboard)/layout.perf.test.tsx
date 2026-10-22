import {act, fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import DashboardLayout from "@/app/(dashboard)/layout";
import {MAIN_CONTENT_ID, SCROLL_DELTA_THRESHOLD, SCROLL_TOP_THRESHOLD} from "@/lib/constants";
import {useAuthStore} from "@/lib/store/auth";
import {useUIStore} from "@/lib/store/ui";

// Render counts are allowed only in *.perf.test.tsx (run by `pnpm test:perf` with the React Compiler on).
const renders = vi.hoisted(() => ({sidebar: 0, header: 0}));

vi.mock("@/lib/api", async (importOriginal) => ({...await importOriginal<typeof import("@/lib/api")>(), fetchWithAuth: vi.fn()}));
vi.mock("next/navigation", () => ({useRouter: () => ({replace: vi.fn()}), usePathname: () => "/links"}));
vi.mock("@/lib/preload-on-idle", () => ({preloadOnIdle: vi.fn()}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsMobile: () => false}));
vi.mock("@/components/layout/mobile-sidebar-drawer", () => ({MobileSidebarDrawer: () => null}));
vi.mock("@/components/links/CreateLinkModal", () => ({CreateLinkModal: () => null}));
vi.mock("@/components/tags/CreateTagModal", () => ({CreateTagModal: () => null}));
vi.mock("@/components/layout/Sidebar", () => ({
    Sidebar: () => {
        renders.sidebar++;
        return <nav>sidebar</nav>;
    },
}));
vi.mock("@/components/layout/Header", () => ({
    Header: () => {
        renders.header++;
        return <header>header</header>;
    },
}));

const SCROLL_STEPS = 6;

function scrollMainTo(scrollTop: number): void {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) throw new Error("main content not rendered");
    Object.defineProperty(main, "scrollTop", {configurable: true, value: scrollTop});
    fireEvent.scroll(main);
}

describe("dashboard layout render counts", () => {
    beforeEach(async () => {
        useAuthStore.setState({accessToken: "token", user: {email: "ada@example.com", name: "Ada"}});
        useUIStore.setState({isCreateModalOpen: false, isCreateTagModalOpen: false, isShortcutsDialogOpen: false});
        render(<DashboardLayout><p>page content</p></DashboardLayout>);
        await screen.findByText("page content");
        renders.sidebar = 0;
        renders.header = 0;
    });

    it("does not re-render the sidebar or header when a dialog opens and closes", () => {
        act(() => useUIStore.getState().setCreateTagModalOpen(true));
        act(() => useUIStore.getState().setCreateTagModalOpen(false));

        expect(renders.sidebar).toBe(0);
        expect(renders.header).toBe(0);
    });

    it("does not re-render the sidebar or header while the page scrolls past the header thresholds", () => {
        for (let step = 1; step <= SCROLL_STEPS; step++) {
            scrollMainTo(SCROLL_TOP_THRESHOLD + step * (SCROLL_DELTA_THRESHOLD + 1) * (step % 2 === 0 ? 1 : 3));
        }
        expect(screen.getByText("header").parentElement?.parentElement).toHaveClass("shadow-sm");
        scrollMainTo(0);

        expect(renders.sidebar).toBe(0);
        expect(renders.header).toBe(0);
    });
});
