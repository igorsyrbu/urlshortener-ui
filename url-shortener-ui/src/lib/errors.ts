import {
    HTTP_BAD_REQUEST,
    HTTP_CONFLICT,
    HTTP_FORBIDDEN,
    HTTP_GATEWAY_TIMEOUT,
    HTTP_INTERNAL_SERVER_ERROR,
    HTTP_NOT_FOUND,
    HTTP_PAYLOAD_TOO_LARGE,
    HTTP_REQUEST_TIMEOUT,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNAUTHORIZED,
} from "@/lib/http-status";

export const ERROR_COPY = {
    BAD_REQUEST: "The request was not accepted. Check the details and try again.",
    UNAUTHORIZED: "Your session has ended. Sign in again.",
    FORBIDDEN: "You don't have permission to do that.",
    NOT_FOUND: "We couldn't find what you asked for. It may have been removed.",
    TIMEOUT: "The server took too long to answer. Try again.",
    CONFLICT: "That clashes with something that already exists.",
    TOO_LARGE: "That is too large to send.",
    RATE_LIMITED: "Too many requests. Wait a moment and try again.",
    SERVER: "Something went wrong on our side. Try again in a moment.",
    UNKNOWN: "Something went wrong. Try again.",
    NETWORK: "Couldn't reach the server. Check your connection and try again.",
} as const;

const COPY_BY_STATUS: ReadonlyMap<number, string> = new Map([
    [HTTP_BAD_REQUEST, ERROR_COPY.BAD_REQUEST],
    [HTTP_UNAUTHORIZED, ERROR_COPY.UNAUTHORIZED],
    [HTTP_FORBIDDEN, ERROR_COPY.FORBIDDEN],
    [HTTP_NOT_FOUND, ERROR_COPY.NOT_FOUND],
    [HTTP_REQUEST_TIMEOUT, ERROR_COPY.TIMEOUT],
    [HTTP_GATEWAY_TIMEOUT, ERROR_COPY.TIMEOUT],
    [HTTP_CONFLICT, ERROR_COPY.CONFLICT],
    [HTTP_PAYLOAD_TOO_LARGE, ERROR_COPY.TOO_LARGE],
    [HTTP_TOO_MANY_REQUESTS, ERROR_COPY.RATE_LIMITED],
]);

/** User-facing text for a failed response; the status code itself is never shown. */
export function describeHttpFailure(status: number): string {
    const known = COPY_BY_STATUS.get(status);
    if (known) return known;
    return status >= HTTP_INTERNAL_SERVER_ERROR ? ERROR_COPY.SERVER : ERROR_COPY.UNKNOWN;
}

/** User-facing text for a request that threw: fetch rejects with a TypeError only when the network failed. */
export function describeRequestError(error: unknown): string {
    return error instanceof TypeError ? ERROR_COPY.NETWORK : ERROR_COPY.UNKNOWN;
}
