import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import DashboardLayout from "@/app/(dashboard)/layout";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, MAIN_CONTENT_ID, ROUTES, SESSION_CHECK_COPY, SKIP_TO_CONTENT_LABEL} from "@/lib/constants";
import {hasSessionHint, setSessionHint} from "@/lib/session-hint";
import {useAuthStore, UserProfile} from "@/lib/store/auth";
import {useUIStore} from "@/lib/store/ui";

const mocks = vi.hoisted(() => {
    const replace = vi.fn();
    return {replace, router: {replace}, pathname: {current: "/links"}};
});

vi.mock("@/lib/api", async (importOriginal) => ({...await importOriginal<typeof import("@/lib/api")>(), fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));
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
const HTTP_SERVICE_UNAVAILABLE = 503;

function renderLayout(): void {
    render(<DashboardLayout><p>page content</p></DashboardLayout>);
}

function signIn(): void {
    useAuthStore.setState({accessToken: "token", user: USER});
}

function holdProfileRequest(): void {
    vi.mocked(fetchWithAuth).mockReturnValue(new Promise(() => undefined));
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

    it("shows a progress message while a session this browser has not seen is verified", () => {
        holdProfileRequest();

        renderLayout();

        expect(screen.getByText(SESSION_CHECK_COPY.CHECKING)).toBeInTheDocument();
        expect(screen.queryByText("page content")).not.toBeInTheDocument();
    });

    it("renders the shell and the page while the profile loads when this browser had a session", () => {
        setSessionHint();
        holdProfileRequest();

        renderLayout();

        expect(screen.getByText("page content")).toBeInTheDocument();
        expect(screen.getByRole("navigation")).toBeInTheDocument();
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME);
    });

    it("restores the user, remembers the session and renders the page", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(USER));

        renderLayout();

        expect(await screen.findByText("page content")).toBeInTheDocument();
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME);
        expect(useAuthStore.getState().user).toEqual(USER);
        expect(hasSessionHint()).toBe(true);
        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("redirects to login when the profile request is rejected", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 401}));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
        expect(screen.queryByText("page content")).not.toBeInTheDocument();
    });

    it("hides the page, forgets the session and redirects when a remembered session is rejected", async () => {
        setSessionHint();
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 401}));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
        expect(screen.queryByText("page content")).not.toBeInTheDocument();
        expect(hasSessionHint()).toBe(false);
    });

    it("redirects to login when a token exists but the user profile is missing", async () => {
        useAuthStore.setState({accessToken: "token", user: null});
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 401}));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
    });
});

describe("DashboardLayout when the session cannot be checked", () => {
    beforeEach(() => {
        mocks.pathname.current = "/links";
        useAuthStore.setState({accessToken: null, user: null});
    });

    it.each([
        ["the server is unavailable", () => vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: HTTP_SERVICE_UNAVAILABLE}))],
        ["the request fails", () => vi.mocked(fetchWithAuth).mockRejectedValue(new Error("network down"))],
    ])("offers a retry instead of signing out when %s", async (_name, arrangeFailure) => {
        arrangeFailure();

        renderLayout();

        expect(await screen.findByRole("alert")).toHaveTextContent(SESSION_CHECK_COPY.UNAVAILABLE_TITLE);
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(screen.queryByText("page content")).not.toBeInTheDocument();
    });

    it("checks again and renders the page after a successful retry", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_SERVICE_UNAVAILABLE}));
        renderLayout();
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(USER));

        await user.click(await screen.findByRole("button", {name: SESSION_CHECK_COPY.RETRY}));

        expect(await screen.findByText("page content")).toBeInTheDocument();
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("keeps the shell and the page for a remembered session", async () => {
        setSessionHint();
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: HTTP_SERVICE_UNAVAILABLE}));

        renderLayout();

        await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledOnce());
        expect(screen.getByText("page content")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(mocks.replace).not.toHaveBeenCalled();
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

describe("DashboardLayout skip link", () => {
    beforeEach(() => {
        mocks.pathname.current = "/links";
        signIn();
    });

    it("is the first tab stop and points at the main content", async () => {
        const user = userEvent.setup();
        renderLayout();
        await screen.findByText("page content");

        await user.tab();

        const skipLink = screen.getByRole("link", {name: SKIP_TO_CONTENT_LABEL});
        expect(skipLink).toHaveFocus();
        expect(skipLink).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
    });

    it("makes the main landmark focusable as the skip target", async () => {
        renderLayout();

        const main = await screen.findByRole("main");

        expect(main).toHaveAttribute("id", MAIN_CONTENT_ID);
        expect(main).toHaveAttribute("tabindex", "-1");
    });
});
