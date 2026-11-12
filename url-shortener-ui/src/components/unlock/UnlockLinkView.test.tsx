import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent, {type UserEvent} from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";
import {UnlockLinkView} from "@/components/unlock/UnlockLinkView";
import {API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS, CAPTCHA_VERIFYING_LABEL, LINK_PASSWORD_COPY, UNLOCK_COPY} from "@/lib/constants";
import {
    HTTP_FORBIDDEN,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNAUTHORIZED,
} from "@/lib/http-status";
import {getTurnstileProps, resetTurnstileMock} from "@/test/turnstile-utils";

vi.mock("@marsidev/react-turnstile", async () => (await import("@/test/turnstile-utils")).turnstileModuleMock);
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const KEY = "Guide2026";
const PASSWORD = "secret-pass";
const VISITOR_QUERY = "?utm_source=newsletter";
const DESTINATION = "https://example.com/guide?utm_source=newsletter";

function stubLocation(): Mock {
    const assign = vi.fn();
    vi.stubGlobal("location", {...window.location, search: VISITOR_QUERY, assign});
    return assign;
}

function stubFetch(...responses: Response[]): Mock {
    const fetchMock = vi.fn();
    responses.forEach((response) => fetchMock.mockResolvedValueOnce(response));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function problem(status: number, headers: Record<string, string> = {}): Response {
    return Response.json({detail: "refused"}, {status, headers});
}

function renderView(turnstileEnabled = false): void {
    render(<UnlockLinkView linkKey={KEY} turnstileEnabled={turnstileEnabled} turnstileSiteKey="site-key"/>);
}

function getPasswordInput(): HTMLElement {
    return screen.getByLabelText(UNLOCK_COPY.PASSWORD_LABEL);
}

async function submitPassword(user: UserEvent, password = PASSWORD): Promise<void> {
    await user.type(getPasswordInput(), password);
    await user.click(screen.getByRole("button", {name: UNLOCK_COPY.SUBMIT}));
}

afterEach(() => {
    resetTurnstileMock();
});

describe("UnlockLinkView", () => {
    it("asks for the password without revealing anything about the destination", () => {
        renderView();

        expect(screen.getByRole("heading", {name: UNLOCK_COPY.TITLE})).toBeInTheDocument();
        expect(getPasswordInput()).toHaveAttribute("type", "password");
        expect(screen.queryByText(/example\.com/)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: LINK_PASSWORD_COPY.GENERATE})).not.toBeInTheDocument();
    });

    it("posts the password with the visitor's query string and goes to the destination", async () => {
        const user = userEvent.setup();
        const assign = stubLocation();
        const fetchMock = stubFetch(Response.json({longUrl: DESTINATION}));
        renderView();

        await submitPassword(user);

        await waitFor(() => expect(assign).toHaveBeenCalledExactlyOnceWith(DESTINATION));
        expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}${API_ENDPOINTS.SHORTLINK_UNLOCK(KEY)}${VISITOR_QUERY}`);
        expect(screen.getByRole("button", {name: new RegExp(UNLOCK_COPY.REDIRECTING)})).toBeDisabled();
    });

    it("asks for a password before sending anything", async () => {
        const user = userEvent.setup();
        const fetchMock = stubFetch();
        renderView();

        await user.click(screen.getByRole("button", {name: UNLOCK_COPY.SUBMIT}));

        expect(await screen.findByText(UNLOCK_COPY.PASSWORD_REQUIRED)).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("says the password is wrong, clears it and focuses the field", async () => {
        const user = userEvent.setup();
        stubLocation();
        stubFetch(problem(HTTP_UNAUTHORIZED));
        renderView();

        await submitPassword(user);

        expect(await screen.findByText(UNLOCK_COPY.INCORRECT_PASSWORD)).toBeInTheDocument();
        expect(getPasswordInput()).toHaveValue("");
        await waitFor(() => expect(getPasswordInput()).toHaveFocus());
    });

    it("needs a fresh captcha after a wrong password", async () => {
        const user = userEvent.setup();
        stubLocation();
        const fetchMock = stubFetch(problem(HTTP_UNAUTHORIZED));
        renderView(true);
        act(() => getTurnstileProps().onSuccess?.("token-1"));

        await submitPassword(user);

        expect(await screen.findByText(UNLOCK_COPY.INCORRECT_PASSWORD)).toBeInTheDocument();
        expect(new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)).get("cf-turnstile-response")).toBe("token-1");
        expect(screen.getByRole("button", {name: CAPTCHA_VERIFYING_LABEL})).toBeDisabled();
    });

    it("waits for the captcha before the first attempt", () => {
        renderView(true);

        expect(screen.getByRole("button", {name: CAPTCHA_VERIFYING_LABEL})).toBeDisabled();
    });

    it("shows a captcha error when the backend rejects the captcha", async () => {
        const user = userEvent.setup();
        stubLocation();
        stubFetch(problem(HTTP_FORBIDDEN));
        renderView();

        await submitPassword(user);

        expect(await screen.findByText(UNLOCK_COPY.CAPTCHA_FAILED)).toBeInTheDocument();
    });

    it("pauses the submit button after too many attempts", async () => {
        const user = userEvent.setup();
        stubLocation();
        stubFetch(problem(HTTP_TOO_MANY_REQUESTS));
        renderView();

        await submitPassword(user);

        expect(await screen.findByText(UNLOCK_COPY.TOO_MANY_ATTEMPTS)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: UNLOCK_COPY.SUBMIT})).toBeDisabled();
    });

    it("shows the link-not-found state for a missing or unprotected link", async () => {
        const user = userEvent.setup();
        stubLocation();
        stubFetch(problem(HTTP_NOT_FOUND));
        renderView();

        await submitPassword(user);

        expect(await screen.findByRole("heading", {name: UNLOCK_COPY.NOT_FOUND_TITLE})).toBeInTheDocument();
        expect(screen.queryByLabelText(UNLOCK_COPY.PASSWORD_LABEL)).not.toBeInTheDocument();
    });
});
