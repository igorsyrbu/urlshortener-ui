import {render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {beforeEach, describe, expect, it, vi} from "vitest";
import GeneralSettingsPage from "@/app/(dashboard)/settings/general/page";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {UserSession} from "@/lib/session-utils";
import {useAuthStore} from "@/lib/store/auth";
import {createUserSession} from "@/test/user-session-utils";
import {stubDesktopViewport} from "@/test/viewport-utils";

const mocks = vi.hoisted(() => {
    const replace = vi.fn();
    return {replace, router: {replace}};
});

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));
vi.mock("sonner", () => ({toast: {success: vi.fn(), error: vi.fn()}}));
vi.mock("next/navigation", () => ({useRouter: () => mocks.router}));
vi.mock("@/components/settings/ProfileCard", () => ({ProfileCard: () => null}));
vi.mock("@/components/settings/AppearanceCard", () => ({AppearanceCard: () => null}));
vi.mock("@/components/settings/ThemeCard", () => ({ThemeCard: () => null}));
vi.mock("@/components/settings/PreferencesCard", () => ({PreferencesCard: () => null}));

const SECONDS_PER_HOUR = 3600;
const TOKEN_LIFETIME_HOURS = 2;
const TOKEN_ISSUED_AT = 1_700_000_000;

const CURRENT = createUserSession({id: "current", current: true, device: "MacBook", os: "macOS"});
const PHONE = createUserSession({id: "phone", device: "iPhone", os: "iOS"});
const LAPTOP = createUserSession({id: "laptop", device: "ThinkPad", os: "Linux"});

function createAccessToken(): string {
    const claims = {iat: TOKEN_ISSUED_AT, exp: TOKEN_ISSUED_AT + TOKEN_LIFETIME_HOURS * SECONDS_PER_HOUR};
    return `header.${btoa(JSON.stringify(claims))}.signature`;
}

function mockSessionsResponse(sessions: UserSession[]): void {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(sessions));
}

function deleteCalls(): string[] {
    return vi.mocked(fetchWithAuth).mock.calls
        .filter(([, options]) => options?.method === "DELETE")
        .map(([endpoint]) => endpoint);
}

async function renderPageWith(sessions: UserSession[]): Promise<ReturnType<typeof userEvent.setup>> {
    mockSessionsResponse(sessions);
    render(<GeneralSettingsPage/>);
    await waitFor(() => expect(screen.queryByRole("status", {name: "Loading sessions"})).not.toBeInTheDocument());
    return userEvent.setup();
}

function rowOf(deviceText: string): HTMLElement {
    const row = screen.getByText(deviceText).closest<HTMLElement>("div.justify-between");
    if (!row) throw new Error(`Row for ${deviceText} not found`);
    return row;
}

async function confirmInDialog(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(await screen.findByRole("button", {name: "Continue"}));
}

describe("GeneralSettingsPage sessions", () => {
    beforeEach(() => {
        stubDesktopViewport();
        useAuthStore.setState({accessToken: createAccessToken(), user: {email: "ada@example.com", name: "Ada"}});
    });

    it("shows a skeleton only for the current device while the sessions load", () => {
        vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise(() => undefined));
        render(<GeneralSettingsPage/>);

        expect(screen.getByRole("status", {name: "Loading sessions"})).toBeInTheDocument();
        expect(screen.queryByText("Active Sessions")).not.toBeInTheDocument();
    });

    it("loads sessions and shows the current device apart from the other ones", async () => {
        await renderPageWith([PHONE, CURRENT]);

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_SESSIONS);
        expect(within(rowOf("MacBook (macOS)")).getByText("Current")).toBeInTheDocument();
        expect(screen.getByText("Active Sessions")).toBeInTheDocument();
        expect(screen.getByText("iPhone (iOS)")).toBeInTheDocument();
    });

    it("hides the other sessions section when this is the only session", async () => {
        await renderPageWith([CURRENT]);

        expect(screen.queryByText("Active Sessions")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Terminate all other sessions"})).not.toBeInTheDocument();
    });

    it("explains that the current session is unavailable when the request is rejected", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        render(<GeneralSettingsPage/>);

        expect(await screen.findByText("Current session information unavailable.")).toBeInTheDocument();
    });

    it("logs the failure and stops loading when the request throws", async () => {
        const failure = new Error("offline");
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(failure);

        render(<GeneralSettingsPage/>);

        expect(await screen.findByText("Current session information unavailable.")).toBeInTheDocument();
        expect(logger.error).toHaveBeenCalledWith("Failed to load sessions", failure);
    });

    it("warns about the token lifetime before terminating another session", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);

        await user.click(within(rowOf("iPhone (iOS)")).getByRole("button", {name: "Log out"}));

        expect(await screen.findByText(/up to 2 hours 0 minutes to take effect on that device/)).toBeInTheDocument();
    });

    it("terminates another session after confirmation and removes it from the list", async () => {
        const user = await renderPageWith([CURRENT, PHONE, LAPTOP]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));

        await user.click(within(rowOf("iPhone (iOS)")).getByRole("button", {name: "Log out"}));
        await confirmInDialog(user);

        await waitFor(() => expect(screen.queryByText("iPhone (iOS)")).not.toBeInTheDocument());
        expect(deleteCalls()).toEqual(["/users/sessions/phone"]);
        expect(toast.success).toHaveBeenCalledExactlyOnceWith("Session terminated successfully");
        expect(screen.getByText("ThinkPad (Linux)")).toBeInTheDocument();
    });

    it("does nothing when the confirmation is cancelled", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);

        await user.click(within(rowOf("iPhone (iOS)")).getByRole("button", {name: "Log out"}));
        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(deleteCalls()).toEqual([]);
        expect(screen.getByText("iPhone (iOS)")).toBeInTheDocument();
    });

    it("keeps the session and shows an error toast when termination is rejected", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        await user.click(within(rowOf("iPhone (iOS)")).getByRole("button", {name: "Log out"}));
        await confirmInDialog(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Failed to terminate session"));
        expect(screen.getByText("iPhone (iOS)")).toBeInTheDocument();
    });

    it("reports an unexpected error when terminating a session throws", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));

        await user.click(within(rowOf("iPhone (iOS)")).getByRole("button", {name: "Log out"}));
        await confirmInDialog(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("An unexpected error occurred while terminating session"));
        expect(logger.error).toHaveBeenCalledWith("Error terminating session", expect.any(Error));
    });

    it("signs out and goes to the login page after terminating the current session", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));

        await user.click(within(rowOf("MacBook (macOS)")).getByRole("button", {name: "Log out"}));
        expect(await screen.findByText(/signed out immediately/)).toBeInTheDocument();
        await confirmInDialog(user);

        await waitFor(() => expect(mocks.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN));
        expect(deleteCalls()).toEqual([API_ENDPOINTS.USERS_SESSIONS_CURRENT]);
        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
    });

    it("stays signed in when terminating the current session fails", async () => {
        const user = await renderPageWith([CURRENT]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        await user.click(within(rowOf("MacBook (macOS)")).getByRole("button", {name: "Log out"}));
        await confirmInDialog(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Failed to terminate session"));
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(useAuthStore.getState().user).not.toBeNull();
    });

    it("terminates all other sessions and keeps only the current one", async () => {
        const user = await renderPageWith([CURRENT, PHONE, LAPTOP]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));

        await user.click(screen.getByRole("button", {name: "Terminate all other sessions"}));
        expect(await screen.findByText(/across all systems/)).toBeInTheDocument();
        await confirmInDialog(user);

        await waitFor(() => expect(screen.queryByText("Active Sessions")).not.toBeInTheDocument());
        expect(deleteCalls()).toEqual([API_ENDPOINTS.USERS_SESSIONS_OTHER]);
        expect(toast.success).toHaveBeenCalledExactlyOnceWith("Successfully logged out of all other devices");
        expect(screen.getByText("MacBook (macOS)")).toBeInTheDocument();
    });

    it("keeps the other sessions when terminating them is rejected", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        await user.click(screen.getByRole("button", {name: "Terminate all other sessions"}));
        await confirmInDialog(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Failed to terminate other sessions"));
        expect(screen.getByText("iPhone (iOS)")).toBeInTheDocument();
    });

    it("reports an unexpected error when terminating other sessions throws", async () => {
        const user = await renderPageWith([CURRENT, PHONE]);
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));

        await user.click(screen.getByRole("button", {name: "Terminate all other sessions"}));
        await confirmInDialog(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("An unexpected error occurred while terminating other sessions"));
    });

    it("falls back to the default token lifetime when the token is not a valid JWT", async () => {
        useAuthStore.setState({accessToken: "not-a-jwt"});
        const user = await renderPageWith([CURRENT, PHONE]);

        await user.click(within(rowOf("iPhone (iOS)")).getByRole("button", {name: "Log out"}));

        expect(await screen.findByText(/up to 1 hour to take effect/)).toBeInTheDocument();
    });
});

describe("GeneralSettingsPage account deletion dialog", () => {
    beforeEach(() => {
        stubDesktopViewport();
        useAuthStore.setState({accessToken: createAccessToken(), user: {email: "ada@example.com", name: "Ada"}});
    });

    it("opens the delete account confirmation from the danger zone", async () => {
        const user = await renderPageWith([CURRENT]);

        await user.click(screen.getByRole("button", {name: "Delete Account"}));

        expect(await screen.findByLabelText("Please type in your email to confirm.")).toBeInTheDocument();
    });
});

