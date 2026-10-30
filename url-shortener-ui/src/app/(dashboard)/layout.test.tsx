import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import DashboardLayout from "@/app/(dashboard)/layout";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, MAIN_CONTENT_ID, ROUTES, SESSION_CHECK_COPY, SKIP_TO_CONTENT_LABEL} from "@/lib/constants";
import {clearSessionHint, hasSessionHint, setSessionHint} from "@/lib/session-hint";
import {preloadOnIdle} from "@/lib/preload-on-idle";
import {CreateLinkModal} from "@/components/links/CreateLinkModal";
import {CreateTagModal} from "@/components/tags/CreateTagModal";
import {useAuthStore} from "@/lib/store/auth";
import type {UserProfile} from "@/lib/types";
import {useUIStore} from "@/lib/store/ui";
import {SHORTCUTS} from "@/lib/keyboard-shortcuts";
import {useShortcutsStore} from "@/lib/store/shortcuts";
import {SHORTCUTS_ENABLED_STORAGE_KEY} from "@/lib/constants";

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
vi.mock("@/lib/preload-on-idle", () => ({preloadOnIdle: vi.fn()}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsMobile: () => false}));
vi.mock("@/components/layout/mobile-sidebar-drawer", () => ({MobileSidebarDrawer: () => null}));
vi.mock("@/components/links/CreateLinkModal", () => ({
    CreateLinkModal: ({open}: {open: boolean}) => <div data-testid={CREATE_LINK_DIALOG} data-open={open}/>,
}));
vi.mock("@/components/tags/CreateTagModal", () => ({
    CreateTagModal: ({open}: {open: boolean}) => <div data-testid={CREATE_TAG_DIALOG} data-open={open}/>,
}));
vi.mock("@/components/layout/Header", () => ({
    Header: ({onCreateClick, createLabel}: {onCreateClick: () => void; createLabel: string}) => (
        <button onClick={onCreateClick}>{createLabel}</button>
    ),
}));

const CREATE_LINK_DIALOG = "create link modal";
const CREATE_TAG_DIALOG = "create tag modal";
const USER: UserProfile = {email: "ada@example.com", name: "Ada"};
const HTTP_SERVICE_UNAVAILABLE = 503;

function renderLayout(): void {
    render(<DashboardLayout><p>page content</p></DashboardLayout>);
}

function signIn(): void {
    setSessionHint();
    vi.mocked(fetchWithAuth).mockImplementation(() => Promise.resolve(Response.json(USER)));
}

function holdProfileRequest(): void {
    vi.mocked(fetchWithAuth).mockReturnValue(new Promise(() => undefined));
}

describe("DashboardLayout authentication", () => {
    beforeEach(() => {
        mocks.pathname.current = "/links";
        useAuthStore.setState({accessToken: null});
        useUIStore.setState({isCreateModalOpen: false, isCreateTagModalOpen: false});
    });

    it("renders the page and loads the profile once when a session already exists", async () => {
        signIn();

        renderLayout();

        expect(await screen.findByText("page content")).toBeInTheDocument();
        await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME, expect.anything()));
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
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME, expect.anything());
    });

    it("remembers the session and renders the page once the profile loads", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(USER));

        renderLayout();

        expect(await screen.findByText("page content")).toBeInTheDocument();
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME, expect.anything());
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

    it("redirects to login when a token exists but the profile request is rejected", async () => {
        useAuthStore.setState({accessToken: "token"});
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 401}));

        renderLayout();

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
    });
});

describe("DashboardLayout when the session cannot be checked", () => {
    beforeEach(() => {
        mocks.pathname.current = "/links";
        useAuthStore.setState({accessToken: null});
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
        mocks.pathname.current = "/links";
        signIn();
        useUIStore.setState({isCreateModalOpen: false, isCreateTagModalOpen: false});
    });

    it("opens the link modal from the links page", async () => {
        const user = userEvent.setup();
        renderLayout();

        await user.click(await screen.findByRole("button", {name: "Create link"}));

        expect(await screen.findByTestId(CREATE_LINK_DIALOG)).toHaveAttribute("data-open", "true");
        expect(screen.queryByTestId(CREATE_TAG_DIALOG)).not.toBeInTheDocument();
    });

    it.each(["/tags", "/tags/tag-1"])("opens the tag modal from %s", async (pathname) => {
        mocks.pathname.current = pathname;
        const user = userEvent.setup();
        renderLayout();

        await user.click(await screen.findByRole("button", {name: "Create tag"}));

        expect(await screen.findByTestId(CREATE_TAG_DIALOG)).toHaveAttribute("data-open", "true");
        expect(screen.queryByTestId(CREATE_LINK_DIALOG)).not.toBeInTheDocument();
    });

    it("does not mount the create dialogs before one is opened", async () => {
        renderLayout();

        await screen.findByRole("button", {name: "Create link"});

        expect(screen.queryByTestId(CREATE_LINK_DIALOG)).not.toBeInTheDocument();
        expect(screen.queryByTestId(CREATE_TAG_DIALOG)).not.toBeInTheDocument();
    });

    it("keeps the link dialog mounted after it closes, so its close animation can play", async () => {
        const user = userEvent.setup();
        renderLayout();
        await user.click(await screen.findByRole("button", {name: "Create link"}));
        await screen.findByTestId(CREATE_LINK_DIALOG);

        act(() => useUIStore.getState().setCreateModalOpen(false));

        expect(screen.getByTestId(CREATE_LINK_DIALOG)).toHaveAttribute("data-open", "false");
    });

    it("preloads the create dialogs on idle once the session is ready", async () => {
        renderLayout();

        await waitFor(() => expect(preloadOnIdle).toHaveBeenCalled());
        const [loaders] = vi.mocked(preloadOnIdle).mock.calls[0];

        expect(await Promise.all(loaders.map((load) => load()))).toEqual([CreateLinkModal, CreateTagModal]);
    });

    it("does not preload anything while the session is still being checked", async () => {
        useAuthStore.setState({accessToken: null});
        clearSessionHint();
        holdProfileRequest();
        renderLayout();

        await screen.findByText(SESSION_CHECK_COPY.CHECKING);

        expect(preloadOnIdle).not.toHaveBeenCalled();
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

describe("DashboardLayout keyboard shortcuts help", () => {
    beforeEach(() => {
        mocks.pathname.current = "/links";
        signIn();
        useUIStore.setState({isShortcutsDialogOpen: false});
        localStorage.clear();
    });

    it("opens the list of every shortcut with the ? key", async () => {
        const user = userEvent.setup();
        renderLayout();
        await screen.findByText("page content");

        await user.keyboard("?");

        const dialog = await screen.findByRole("dialog", {name: "Keyboard shortcuts"});
        for (const shortcut of Object.values(SHORTCUTS)) expect(dialog).toHaveTextContent(shortcut.action);
    });

    it("keeps shortcuts off after a reload when the user turned them off", async () => {
        localStorage.setItem(SHORTCUTS_ENABLED_STORAGE_KEY, "false");
        const user = userEvent.setup();
        renderLayout();
        await screen.findByText("page content");

        await user.keyboard("?");

        expect(useShortcutsStore.getState().isEnabled).toBe(false);
        expect(screen.queryByRole("dialog", {name: "Keyboard shortcuts"})).not.toBeInTheDocument();
        useShortcutsStore.setState({isEnabled: true});
    });
});
