import {UNLOCK_COPY, UNLOCK_RATE_LIMIT_FALLBACK_SECONDS} from "@/lib/constants";
import {describeHttpFailure, describeRequestError} from "@/lib/errors";
import {
    HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNAUTHORIZED,
} from "@/lib/http-status";
import {unlockLink, UnlockLinkError} from "@/lib/link-unlock-api";
import {logger} from "@/lib/logger";
import {isValidUrl} from "@/lib/url-utils";

export type UnlockOutcome =
    | {kind: "unlocked"; longUrl: string}
    | {kind: "not-found"}
    /** The password was refused or the captcha must be solved again: clear the field and reset the widget. */
    | {kind: "rejected"; message: string; shouldResetCaptcha: boolean}
    | {kind: "rate-limited"; message: string; cooldownSeconds: number}
    | {kind: "failed"; message: string};

export interface UnlockAttempt {
    key: string;
    password: string;
    captchaToken: string | null;
    queryString: string;
}

function describeRefusal(error: UnlockLinkError): UnlockOutcome {
    switch (error.status) {
        case HTTP_NOT_FOUND:
            return {kind: "not-found"};
        case HTTP_UNAUTHORIZED:
            return {kind: "rejected", message: UNLOCK_COPY.INCORRECT_PASSWORD, shouldResetCaptcha: true};
        case HTTP_FORBIDDEN:
            return {kind: "rejected", message: UNLOCK_COPY.CAPTCHA_FAILED, shouldResetCaptcha: true};
        case HTTP_TOO_MANY_REQUESTS:
            return {
                kind: "rate-limited",
                message: UNLOCK_COPY.TOO_MANY_ATTEMPTS,
                cooldownSeconds: error.retryAfterSeconds ?? UNLOCK_RATE_LIMIT_FALLBACK_SECONDS,
            };
        case HTTP_BAD_REQUEST:
            return {kind: "failed", message: UNLOCK_COPY.PASSWORD_REQUIRED};
        default:
            return {kind: "failed", message: describeHttpFailure(error.status)};
    }
}

/** Runs one unlock attempt and says what the page should show. Never logs the password. */
export async function attemptUnlock({key, password, captchaToken, queryString}: UnlockAttempt): Promise<UnlockOutcome> {
    try {
        const longUrl = await unlockLink(key, password, captchaToken, queryString);
        if (!isValidUrl(longUrl)) {
            logger.error("Unlocked link has an unsafe destination", undefined, {key});
            return {kind: "failed", message: UNLOCK_COPY.UNSAFE_DESTINATION};
        }
        return {kind: "unlocked", longUrl};
    } catch (error) {
        if (error instanceof UnlockLinkError) return describeRefusal(error);
        logger.error("Failed to unlock link", error, {key});
        return {kind: "failed", message: describeRequestError(error)};
    }
}
