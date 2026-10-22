import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import LoginPage from "./page";
import {API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS, MAGIC_LINK_COOLDOWN_STORAGE_KEY} from "@/lib/constants";
import {ERROR_COPY} from "@/lib/errors";
import {getTurnstileProps, resetTurnstileMock} from "@/test/turnstile-utils";

vi.mock("@marsidev/react-turnstile", async () => (await import("@/test/turnstile-utils")).turnstileModuleMock);
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const EMAIL = "user@example.com";
const OTP_CODE = "AB12CD";
const TURNSTILE_SITE_KEY = "site-key";
const SEND_MAGIC_LINK = "Send magic link";
const GENERATE_ENDPOINT = `${API_BASE_URL}${API_ENDPOINTS.OTT_GENERATE}`;

type UserSession = ReturnType<typeof userEvent.setup>;

function mockFetch(response: Response): Mock {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

async function requestMagicLink(user: UserSession): Promise<void> {
    await user.type(screen.getByLabelText("Email address"), EMAIL);
    await user.click(screen.getByRole("button", {name: SEND_MAGIC_LINK}));
}

async function reachOtpForm(user: UserSession): Promise<void> {
    mockFetch(new Response(null, {status: 200}));
    render(<LoginPage/>);
    await requestMagicLink(user);
    await screen.findByLabelText("Verification code");
}

function sentBody(fetchMock: Mock): URLSearchParams {
    return new URLSearchParams(fetchMock.mock.calls[0][1].body);
}

describe("login page magic link request", () => {
    it("asks for an email before sending anything", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(new Response(null, {status: 200}));
        render(<LoginPage/>);

        await user.click(screen.getByRole("button", {name: SEND_MAGIC_LINK}));

        expect(screen.getByText(/Please enter your email address/)).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("posts the trimmed email as form data", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(new Response(null, {status: 200}));
        render(<LoginPage/>);

        await user.type(screen.getByLabelText("Email address"), `  ${EMAIL}  `);
        await user.click(screen.getByRole("button", {name: SEND_MAGIC_LINK}));

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(GENERATE_ENDPOINT, expect.objectContaining({
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
        }));
        expect(Object.fromEntries(sentBody(fetchMock))).toEqual({username: EMAIL});
    });

    it("switches to the code form after the link is sent", async () => {
        const user = userEvent.setup();

        await reachOtpForm(user);

        expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
        expect(screen.queryByRole("button", {name: SEND_MAGIC_LINK})).not.toBeInTheDocument();
    });

    it("explains a rejected request in plain words without the status code", async () => {
        const user = userEvent.setup();
        mockFetch(new Response(null, {status: 500}));
        render(<LoginPage/>);

        await requestMagicLink(user);

        expect(await screen.findByText((content) => content.includes(ERROR_COPY.SERVER))).toBeInTheDocument();
        expect(screen.queryByText(/500/)).not.toBeInTheDocument();
    });

    it("shows the network error message when the request cannot be made", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        render(<LoginPage/>);

        await requestMagicLink(user);

        expect(await screen.findByText((content) => content.includes(ERROR_COPY.NETWORK))).toBeInTheDocument();
    });

    it("asks the user to try later when rate limited without a retry delay", async () => {
        const user = userEvent.setup();
        mockFetch(new Response(null, {status: 429}));
        render(<LoginPage/>);

        await requestMagicLink(user);

        expect(await screen.findByText(/Too many attempts. Please try again later./)).toBeInTheDocument();
    });
});

describe("login page resend cooldown", () => {
    const COOLDOWN_SECONDS = 90;

    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("locks the form and counts down when rate limited with a retry delay", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockFetch(new Response(null, {status: 429, headers: {"Retry-After": String(COOLDOWN_SECONDS)}}));
        render(<LoginPage/>);

        await requestMagicLink(user);

        expect(await screen.findByText("1:30")).toBeInTheDocument();
        expect(screen.getByLabelText("Email address")).toBeDisabled();
        expect(screen.getByRole("button", {name: SEND_MAGIC_LINK})).toBeDisabled();
    });

    it("unlocks the form when the cooldown elapses", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockFetch(new Response(null, {status: 429, headers: {"Retry-After": "2"}}));
        render(<LoginPage/>);
        await requestMagicLink(user);
        await screen.findByText("0:02");

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        await waitFor(() => expect(screen.getByLabelText("Email address")).toBeEnabled());
        expect(screen.queryByText(/Resend in/)).not.toBeInTheDocument();
    });

    it("locks the form instead of sending when a cooldown is already active for the email", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, JSON.stringify({[EMAIL]: Date.now() + 60_000}));
        const fetchMock = mockFetch(new Response(null, {status: 200}));
        render(<LoginPage/>);

        await user.type(screen.getByLabelText("Email address"), EMAIL);

        await user.click(screen.getByRole("button", {name: SEND_MAGIC_LINK}));

        expect(await screen.findByText(/Resend in/)).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("login page code entry", () => {
    it("hands a complete code to the OTT login form", async () => {
        const user = userEvent.setup();
        await reachOtpForm(user);
        const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => undefined);

        await user.type(screen.getByLabelText("Verification code"), OTP_CODE);
        await user.click(screen.getByRole("button", {name: "Continue"}));

        await waitFor(() => expect(requestSubmit).toHaveBeenCalledOnce());
        const form = requestSubmit.mock.contexts[0] as HTMLFormElement;
        expect(form).toHaveAttribute("action", `${API_BASE_URL}/ott/login`);
        expect(Object.fromEntries(new FormData(form))).toEqual({loginType: "otp", email: EMAIL, code: OTP_CODE});
    });

    it("returns to an empty email form when the user changes the email", async () => {
        const user = userEvent.setup();
        await reachOtpForm(user);

        await user.click(screen.getByRole("button", {name: "Change email address"}));

        expect(screen.getByLabelText("Email address")).toHaveValue("");
        expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
    });
});

describe("login page captcha", () => {
    afterEach(() => {
        resetTurnstileMock();
    });

    it("does not render the captcha when it is disabled", () => {
        render(<LoginPage/>);

        expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
    });

    it("blocks sending until the captcha is solved", () => {
        vi.stubEnv("NEXT_PUBLIC_ENABLE_TURNSTILE", "true");
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", TURNSTILE_SITE_KEY);
        render(<LoginPage/>);

        expect(getTurnstileProps().siteKey).toBe(TURNSTILE_SITE_KEY);
        expect(screen.getByRole("button", {name: /Verifying/})).toBeDisabled();
    });

    it("sends the captcha token along with the email", async () => {
        const user = userEvent.setup();
        vi.stubEnv("NEXT_PUBLIC_ENABLE_TURNSTILE", "true");
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", TURNSTILE_SITE_KEY);
        const fetchMock = mockFetch(new Response(null, {status: 200}));
        render(<LoginPage/>);
        act(() => getTurnstileProps().onSuccess?.("token-123"));

        await requestMagicLink(user);

        await screen.findByLabelText("Verification code");
        expect(Object.fromEntries(sentBody(fetchMock))).toEqual({username: EMAIL, "cf-turnstile-response": "token-123"});
    });

    it("requires a new captcha solution after the previous token expires", () => {
        vi.stubEnv("NEXT_PUBLIC_ENABLE_TURNSTILE", "true");
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", TURNSTILE_SITE_KEY);
        render(<LoginPage/>);
        act(() => getTurnstileProps().onSuccess?.("token-123"));
        expect(screen.getByRole("button", {name: SEND_MAGIC_LINK})).toBeEnabled();

        act(() => getTurnstileProps().onExpire?.());

        expect(screen.getByRole("button", {name: /Verifying/})).toBeDisabled();
    });

    it("fails fast when the captcha is enabled without a site key", () => {
        vi.stubEnv("NEXT_PUBLIC_ENABLE_TURNSTILE", "true");
        vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        expect(() => render(<LoginPage/>)).toThrow("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required");
    });
});

describe("login page Google sign-in", () => {
    it("navigates to the Google authorization endpoint", async () => {
        const user = userEvent.setup();
        const location = {href: ""};
        vi.stubGlobal("location", location);
        render(<LoginPage/>);

        await user.click(screen.getByRole("button", {name: "Sign in with Google"}));

        expect(location.href).toBe(`${API_BASE_URL}/oauth2/authorization/google`);
    });
});
