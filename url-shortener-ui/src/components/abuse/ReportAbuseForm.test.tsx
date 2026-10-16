import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";
import {ReportAbuseForm} from "@/components/abuse/ReportAbuseForm";
import {API_BASE_URL} from "@/lib/api";
import {ABUSE_DESCRIPTION_MAX_LENGTH, ABUSE_REASON_LABELS, API_ENDPOINTS, CAPTCHA_VERIFYING_LABEL} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {getTurnstileProps, resetTurnstileMock} from "@/test/turnstile-utils";

vi.mock("@marsidev/react-turnstile", async () => (await import("@/test/turnstile-utils")).turnstileModuleMock);
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const VALID_URL = "https://sho.rt/abc123";
const VALID_EMAIL = "reporter@example.com";
const TURNSTILE_SITE_KEY = "site-key";
const REPORT_ENDPOINT = `${API_BASE_URL}${API_ENDPOINTS.ABUSE_REPORT}`;

interface RenderOptions {
    turnstileEnabled?: boolean;
    initialShortUrl?: string;
}

function renderForm(options: RenderOptions = {}): void {
    render(
        <ReportAbuseForm
            turnstileEnabled={options.turnstileEnabled ?? false}
            turnstileSiteKey={TURNSTILE_SITE_KEY}
            initialShortUrl={options.initialShortUrl}
        />,
    );
}

function mockFetch(response: Response): Mock {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

async function chooseReason(user: ReturnType<typeof userEvent.setup>, reason: keyof typeof ABUSE_REASON_LABELS): Promise<void> {
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", {name: ABUSE_REASON_LABELS[reason]}));
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.clear(screen.getByLabelText("Link to report"));
    await user.type(screen.getByLabelText("Link to report"), VALID_URL);
    await chooseReason(user, "SPAM_OR_MISLEADING");
    await user.type(screen.getByLabelText("Your email"), VALID_EMAIL);
}

async function submit(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", {name: "Submit report"}));
}

function sentBody(fetchMock: Mock): URLSearchParams {
    return new URLSearchParams(fetchMock.mock.calls[0][1].body);
}

describe("ReportAbuseForm validation", () => {
    it("prefills the link from the initial short URL", () => {
        renderForm({initialShortUrl: VALID_URL});

        expect(screen.getByLabelText("Link to report")).toHaveValue(VALID_URL);
    });

    it("reports every missing required field and sends nothing", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(new Response(null, {status: 201}));
        renderForm();

        await submit(user);

        expect(screen.getByText("Please enter a valid URL starting with http:// or https://")).toBeInTheDocument();
        expect(screen.getByText("Please select a reason")).toBeInTheDocument();
        expect(screen.getByText("Please enter your email address")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("rejects a link that is not http or https", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(new Response(null, {status: 201}));
        renderForm();

        await fillValidForm(user);
        await user.clear(screen.getByLabelText("Link to report"));
        await user.type(screen.getByLabelText("Link to report"), "ftp://sho.rt/abc");
        await submit(user);

        expect(screen.getByText("Please enter a valid URL starting with http:// or https://")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("clears the email error as soon as the user types an email", async () => {
        const user = userEvent.setup();
        mockFetch(new Response(null, {status: 201}));
        renderForm();
        await submit(user);

        await user.type(screen.getByLabelText("Your email"), "a");

        expect(screen.queryByText("Please enter your email address")).not.toBeInTheDocument();
    });

    it("shows a live counter and stops accepting text at the description limit", async () => {
        const user = userEvent.setup();
        renderForm();
        const description = screen.getByLabelText(/Description/);

        await user.click(description);
        await user.paste("a".repeat(ABUSE_DESCRIPTION_MAX_LENGTH));
        await user.type(description, "extra");

        expect(description).toHaveValue("a".repeat(ABUSE_DESCRIPTION_MAX_LENGTH));
        expect(screen.getByText(`${ABUSE_DESCRIPTION_MAX_LENGTH}/${ABUSE_DESCRIPTION_MAX_LENGTH}`)).toBeInTheDocument();
    });
});

describe("ReportAbuseForm submission", () => {
    afterEach(() => {
        resetTurnstileMock();
    });

    it("posts the report as form data and shows the confirmation", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(Response.json({id: "report-1"}, {status: 201}));
        renderForm();

        await fillValidForm(user);
        await user.type(screen.getByLabelText(/Description/), "Looks like phishing");
        await submit(user);

        expect(await screen.findByText("Report received")).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(REPORT_ENDPOINT, expect.objectContaining({
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
        }));
        expect(Object.fromEntries(sentBody(fetchMock))).toEqual({
            shortUrl: VALID_URL,
            reason: "SPAM_OR_MISLEADING",
            reporterEmail: VALID_EMAIL,
            description: "Looks like phishing",
        });
    });

    it("omits the description when it is empty", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(Response.json({id: "report-1"}, {status: 201}));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        await screen.findByText("Report received");
        expect(sentBody(fetchMock).has("description")).toBe(false);
    });

    it("disables the form and shows progress while the request is pending", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(screen.getByRole("button", {name: "Submitting..."})).toBeDisabled();
        expect(screen.getByLabelText("Your email")).toBeDisabled();
    });

    it.each([
        {retryAfter: "1", message: "Too many requests. Please try again in 1 second."},
        {retryAfter: "30", message: "Too many requests. Please try again in 30 seconds."},
    ])("tells the user to wait $retryAfter when rate limited", async ({retryAfter, message}) => {
        const user = userEvent.setup();
        mockFetch(new Response(null, {status: 429, headers: {"Retry-After": retryAfter}}));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(await screen.findByText(message)).toBeInTheDocument();
    });

    it("asks the user to try later when rate limited without a retry delay", async () => {
        const user = userEvent.setup();
        mockFetch(new Response(null, {status: 429}));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(await screen.findByText("Too many requests. Please try again later.")).toBeInTheDocument();
    });

    it("shows the server validation message on a 422", async () => {
        const user = userEvent.setup();
        mockFetch(Response.json({message: "Link is not shortened by us"}, {status: 422}));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(await screen.findByText("Link is not shortened by us")).toBeInTheDocument();
    });

    it("falls back to a generic message on a 422 without details", async () => {
        const user = userEvent.setup();
        mockFetch(Response.json({}, {status: 422}));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(await screen.findByText("Invalid input. Please check your entries.")).toBeInTheDocument();
    });

    it("shows a generic message on an unexpected server error and keeps the entered data", async () => {
        const user = userEvent.setup();
        mockFetch(new Response(null, {status: 500}));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(await screen.findByText("An unexpected error occurred. Please try again later.")).toBeInTheDocument();
        expect(screen.getByLabelText("Your email")).toHaveValue(VALID_EMAIL);
        expect(screen.getByRole("button", {name: "Submit report"})).toBeEnabled();
    });

    it("reports a network failure and logs it", async () => {
        const user = userEvent.setup();
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
        renderForm();

        await fillValidForm(user);
        await submit(user);

        expect(await screen.findByText("Network error. Please check your connection and try again.")).toBeInTheDocument();
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("returns to an empty form after choosing to report another link", async () => {
        const user = userEvent.setup();
        mockFetch(Response.json({id: "report-1"}, {status: 201}));
        renderForm();
        await fillValidForm(user);
        await submit(user);

        await user.click(await screen.findByRole("button", {name: "Report another link"}));

        expect(screen.getByLabelText("Link to report")).toHaveValue("");
        expect(screen.getByLabelText("Your email")).toHaveValue("");
        expect(screen.getByRole("combobox")).toHaveTextContent("Select a reason");
    });
});

describe("ReportAbuseForm captcha", () => {
    afterEach(() => {
        resetTurnstileMock();
    });

    it("does not render the captcha when it is disabled", () => {
        renderForm({turnstileEnabled: false});

        expect(screen.queryByTestId("turnstile-widget")).not.toBeInTheDocument();
    });

    it("passes the site key to the captcha when it is enabled", () => {
        renderForm({turnstileEnabled: true});

        expect(getTurnstileProps().siteKey).toBe(TURNSTILE_SITE_KEY);
    });

    it("sends the captcha token with the report", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(Response.json({id: "report-1"}, {status: 201}));
        renderForm({turnstileEnabled: true});
        act(() => getTurnstileProps().onSuccess?.("token-123"));

        await fillValidForm(user);
        await submit(user);

        await screen.findByText("Report received");
        expect(sentBody(fetchMock).get("cf-turnstile-response")).toBe("token-123");
    });

    it("keeps submit disabled until the captcha is solved", () => {
        renderForm({turnstileEnabled: true});

        expect(screen.getByRole("button", {name: CAPTCHA_VERIFYING_LABEL})).toBeDisabled();
        act(() => getTurnstileProps().onSuccess?.("token-123"));

        expect(screen.getByRole("button", {name: "Submit report"})).toBeEnabled();
    });

    it("disables submit again and sends nothing once the captcha token expires", async () => {
        const user = userEvent.setup();
        const fetchMock = mockFetch(Response.json({id: "report-1"}, {status: 201}));
        renderForm({turnstileEnabled: true});
        act(() => getTurnstileProps().onSuccess?.("token-123"));
        act(() => getTurnstileProps().onExpire?.());

        await fillValidForm(user);
        await user.click(screen.getByRole("button", {name: CAPTCHA_VERIFYING_LABEL}));

        expect(screen.getByRole("button", {name: CAPTCHA_VERIFYING_LABEL})).toBeDisabled();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows an error when the captcha fails", () => {
        renderForm({turnstileEnabled: true});

        act(() => getTurnstileProps().onError?.("300030"));

        expect(screen.getByText("Captcha verification failed. Please try again.")).toBeInTheDocument();
    });
});
