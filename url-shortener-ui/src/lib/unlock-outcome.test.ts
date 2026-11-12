import {describe, expect, it, vi} from "vitest";
import {UNLOCK_COPY, UNLOCK_RATE_LIMIT_FALLBACK_SECONDS} from "@/lib/constants";
import {ERROR_COPY} from "@/lib/errors";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNAUTHORIZED,
} from "@/lib/http-status";
import {unlockLink, UnlockLinkError} from "@/lib/link-unlock-api";
import {logger} from "@/lib/logger";
import {attemptUnlock, type UnlockAttempt} from "@/lib/unlock-outcome";

vi.mock("@/lib/link-unlock-api", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/link-unlock-api")>()),
    unlockLink: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const PASSWORD = "secret-pass";
const ATTEMPT: UnlockAttempt = {key: "Guide", password: PASSWORD, captchaToken: null, queryString: ""};

function refuse(status: number, retryAfterSeconds: number | null = null): void {
    vi.mocked(unlockLink).mockRejectedValueOnce(new UnlockLinkError(status, "refused", retryAfterSeconds));
}

describe("attemptUnlock", () => {
    it("returns the destination of an unlocked link", async () => {
        vi.mocked(unlockLink).mockResolvedValueOnce("https://example.com/a");

        await expect(attemptUnlock(ATTEMPT)).resolves.toEqual({kind: "unlocked", longUrl: "https://example.com/a"});
    });

    it("refuses to navigate to a destination that is not http(s)", async () => {
        vi.mocked(unlockLink).mockResolvedValueOnce("javascript:alert(1)");

        await expect(attemptUnlock(ATTEMPT)).resolves.toEqual({kind: "failed", message: UNLOCK_COPY.UNSAFE_DESTINATION});
    });

    it.each([
        [HTTP_UNAUTHORIZED, {kind: "rejected", message: UNLOCK_COPY.INCORRECT_PASSWORD, shouldResetCaptcha: true}],
        [HTTP_FORBIDDEN, {kind: "rejected", message: UNLOCK_COPY.CAPTCHA_FAILED, shouldResetCaptcha: true}],
        [HTTP_NOT_FOUND, {kind: "not-found"}],
        [HTTP_BAD_REQUEST, {kind: "failed", message: UNLOCK_COPY.PASSWORD_REQUIRED}],
        [HTTP_INTERNAL_SERVER_ERROR, {kind: "failed", message: ERROR_COPY.SERVER}],
    ])("maps a %s answer", async (status, expected) => {
        refuse(status);

        await expect(attemptUnlock(ATTEMPT)).resolves.toEqual(expected);
    });

    it("rests for the retry delay of a rate limit", async () => {
        refuse(HTTP_TOO_MANY_REQUESTS, 12);

        await expect(attemptUnlock(ATTEMPT)).resolves.toEqual({kind: "rate-limited", message: UNLOCK_COPY.TOO_MANY_ATTEMPTS, cooldownSeconds: 12});
    });

    it("rests for a fixed while after a lockout, which sends no retry delay", async () => {
        refuse(HTTP_TOO_MANY_REQUESTS);

        await expect(attemptUnlock(ATTEMPT)).resolves.toMatchObject({cooldownSeconds: UNLOCK_RATE_LIMIT_FALLBACK_SECONDS});
    });

    it("reports a network failure and never logs the password", async () => {
        vi.mocked(unlockLink).mockRejectedValueOnce(new TypeError("Failed to fetch"));

        await expect(attemptUnlock(ATTEMPT)).resolves.toEqual({kind: "failed", message: ERROR_COPY.NETWORK});
        expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(PASSWORD);
    });
});
