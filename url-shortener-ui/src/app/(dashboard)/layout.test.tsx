import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import DashboardLayout from "@/app/(dashboard)/layout";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {useAuthStore, UserProfile} from "@/lib/store/auth";
import {useUIStore} from "@/lib/store/ui";

const mocks = vi.hoisted(() => {
    const replace = vi.fn();
    return {replace, router: {replace}, pathname: {current: "/links"}};
});

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("next/navigation", () => ({
    useRouter: () => mocks.router,
    usePathname: () => mocks.pathname.current,
}));
vi.mock("@/components/layout/Sidebar", () => ({Sidebar: () => <nav>sidebar</nav>}));
vi.mock("@/components/layout/mobile-sidebar-drawer", () => ({MobileSidebarDrawer: () => null}));
vi.mock("@/components/links/CreateLinkModal", () => ({
    CreateLinkModal: ({open}: {open: boolean}) => (open ? <div>create link modal</div> : null),
}));
vi.mock("@/components/tags/CreateTagModal", () => ({
    CreateTagModal: ({open}: {open: boolean}) => (open ? <div>create tag modal</div> : null),
}));
vi.mock("@/components/layout/Header", () => ({
    Header: ({onCreateClick, createLabel}: {onCreateClick: () => void; createLabel: string}) => (
        <button onClick={onCreateClick}>{createLabel}</button>
    ),
}));

const USER: UserProfile = {email: "ada@example.com", name: "Ada"};

function renderLayout(): void {
    render(<DashboardLayout><p>page content</p></DashboardLayout>);
}

function signIn(): void {
    useAuthStore.setState({accessToken: "token", user: USER});
}

describe("DashboardLayout authentication", () => {
    beforeEach(() => {
        mocks.pathname.current = "/links";
        useAuthStore.setState({accessToken: null, user: null});
        useUIStore.setState({isCreateModalOpen: false, isCreateTagModalOpen: false});
    });

    it("renders the page without fetching the profile when a session already exists", async () => {
        signIn();

        renderLayout();

        expect(await screen.findByText("page content")).toBeInTheDocument();
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("shows a progress message while the session is being verified", () => {
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise(() => undefined));

        renderLayout();

        expect(screen.getByText("Securing session...")).toBeInTheDocument();
        expect(screen.queryByText("page content")).not.toBeInTheDocument();
    });

    it("restores the user from the profile endpoint and renders the page", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(USER));

        renderLayout();

        expect(await screen.findByText("page content")).toBeInTheDocument();
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME);
        expect(useAuthStore.getState().user).toEqual(USER);
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("redirects to login when the profile request is rejected", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 401}));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
        expect(screen.queryByText("page content")).not.toBeInTheDocument();
    });

    it("redirects to login when the profile request fails", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValue(new Error("network down"));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
    });

    it("redirects to login when a token exists but the user profile is missing", async () => {
        useAuthStore.setState({accessToken: "token", user: null});
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 401}));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
    });
});

describe("DashboardLayout create action", () => {
    beforeEach(() => {
        signIn();
        useUIStore.setState({isCreateModalOpen: false, isCreateTagModalOpen: false});
    });

    it("opens the link modal from the links page", async () => {
        mocks.pathname.current = "/links";
        const user = userEvent.setup();
        renderLayout();

        await user.click(await screen.findByRole("button", {name: "Create link"}));

        expect(screen.getByText("create link modal")).toBeInTheDocument();
        expect(screen.queryByText("create tag modal")).not.toBeInTheDocument();
    });

    it.each(["/tags", "/tags/tag-1"])("opens the tag modal from %s", async (pathname) => {
        mocks.pathname.current = pathname;
        const user = userEvent.setup();
        renderLayout();

        await user.click(await screen.findByRole("button", {name: "Create tag"}));

        expect(screen.getByText("create tag modal")).toBeInTheDocument();
        expect(screen.queryByText("create link modal")).not.toBeInTheDocument();
    });

    it("does not treat a similarly named route as the tags page", async () => {
        mocks.pathname.current = "/tagsets";
        renderLayout();

        expect(await screen.findByRole("button", {name: "Create link"})).toBeInTheDocument();
    });
});
