import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {SidebarUserMenu} from "@/components/layout/sidebar-user-menu";
import {fetchWithAuth} from "@/lib/api";
import {logger} from "@/lib/logger";
import {useAuthStore} from "@/lib/store/auth";
import {ICON_BUTTON_LABELS} from "@/lib/constants";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

const mediaQuery = vi.hoisted(() => ({isDesktop: true}));
const navigation = vi.hoisted(() => {
    const router = {push: vi.fn(), replace: vi.fn()};
    return {router};
});

vi.mock("next/navigation", () => ({useRouter: () => navigation.router}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => mediaQuery.isDesktop,
    useIsMobile: () => !mediaQuery.isDesktop,
}));

const USER = {email: "ada@example.com", name: "Ada Lovelace"};
const SESSION_ENDPOINT = "/users/sessions/current";

type UserSession = ReturnType<typeof userEvent.setup>;

function renderMenu(onNavigate?: () => void): void {
    useAuthStore.setState({user: USER, accessToken: "jwt"});
    render(<SidebarUserMenu onNavigate={onNavigate}/>);
}

async function openMenu(user: UserSession): Promise<void> {
    await user.click(screen.getByText(USER.name));
}

async function chooseLogOutAndConfirm(user: UserSession): Promise<void> {
    await openMenu(user);
    await user.click(await screen.findByRole(mediaQuery.isDesktop ? "menuitem" : "button", {name: "Log out"}));
    await screen.findByText("Are you sure?");
    await user.click(screen.getByRole("button", {name: "Log out"}));
}

describe.each([
    {layout: "desktop menu", isDesktop: true},
    {layout: "mobile drawer", isDesktop: false},
])("SidebarUserMenu in $layout", ({isDesktop}) => {
    beforeEach(() => {
        mediaQuery.isDesktop = isDesktop;
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 204}));
    });

    it("can be opened from the keyboard", async () => {
        const user = userEvent.setup();
        renderMenu();

        await user.tab();
        expect(screen.getByRole("button", {name: ICON_BUTTON_LABELS.ACCOUNT_MENU})).toHaveFocus();
        await user.keyboard("{Enter}");

        expect(await screen.findByText(USER.email)).toBeInTheDocument();
    });

    it("tells assistive technology whether the account menu is open", async () => {
        const user = userEvent.setup();
        renderMenu();
        const trigger = screen.getByRole("button", {name: ICON_BUTTON_LABELS.ACCOUNT_MENU});
        expect(trigger).toHaveAttribute("aria-expanded", "false");

        await openMenu(user);

        await screen.findByText(USER.email);
        expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("shows the user name and email once opened", async () => {
        const user = userEvent.setup();
        renderMenu();

        await openMenu(user);

        expect(await screen.findByText(USER.email)).toBeInTheDocument();
    });

    it("opens settings and tells the sidebar to close", async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();
        renderMenu(onNavigate);

        await openMenu(user);
        await user.click(await screen.findByText("Settings"));

        expect(navigation.router.push).toHaveBeenCalledExactlyOnceWith(SETTINGS_ROUTES.DEFAULT);
        expect(onNavigate).toHaveBeenCalledOnce();
    });

    it("asks for confirmation before logging out", async () => {
        const user = userEvent.setup();
        renderMenu();

        await openMenu(user);
        await user.click(await screen.findByRole(isDesktop ? "menuitem" : "button", {name: "Log out"}));

        expect(await screen.findByText("Are you sure?")).toBeInTheDocument();
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("ends the session, clears the user and returns to login after confirming", async () => {
        const user = userEvent.setup();
        renderMenu();

        await chooseLogOutAndConfirm(user);

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(SESSION_ENDPOINT, {method: "DELETE"});
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(navigation.router.replace).toHaveBeenCalledExactlyOnceWith("/login");
    });

    it("still logs out locally when ending the backend session fails", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockRejectedValue(new Error("offline"));
        renderMenu();

        await chooseLogOutAndConfirm(user);

        expect(useAuthStore.getState().user).toBeNull();
        expect(navigation.router.replace).toHaveBeenCalledExactlyOnceWith("/login");
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("keeps the user signed in when the confirmation is cancelled", async () => {
        const user = userEvent.setup();
        renderMenu();
        await openMenu(user);
        await user.click(await screen.findByRole(isDesktop ? "menuitem" : "button", {name: "Log out"}));
        await screen.findByText("Are you sure?");

        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(useAuthStore.getState().user).toEqual(USER);
        expect(navigation.router.replace).not.toHaveBeenCalled();
    });
});

describe("SidebarUserMenu trigger", () => {
    beforeEach(() => {
        mediaQuery.isDesktop = true;
    });

    it("falls back to the email when the user has no name", () => {
        useAuthStore.setState({user: {email: USER.email, name: ""}});
        render(<SidebarUserMenu/>);

        expect(screen.getByText(USER.email)).toBeInTheDocument();
    });
});

describe("SidebarUserMenu while the profile loads", () => {
    beforeEach(() => {
        mediaQuery.isDesktop = true;
        useAuthStore.setState({user: null, accessToken: null});
    });

    it("keeps the account menu reachable without showing a name", () => {
        render(<SidebarUserMenu/>);

        const trigger = screen.getByRole("button", {name: ICON_BUTTON_LABELS.ACCOUNT_MENU});
        expect(trigger).toBeEnabled();
        expect(trigger).not.toHaveTextContent(USER.name);
    });
});
