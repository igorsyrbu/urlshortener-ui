import {useAuthStore} from "@/lib/store/auth";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {clearSessionHint} from "@/lib/session-hint";
import {HTTP_FORBIDDEN, HTTP_SERVICE_UNAVAILABLE, HTTP_UNAUTHORIZED} from "@/lib/http-status";

export const API_BASE_URL = "/api";
export {HTTP_FORBIDDEN, HTTP_SERVICE_UNAVAILABLE, HTTP_UNAUTHORIZED} from "@/lib/http-status";

const JSON_CONTENT_TYPE = "application/json";
const REFRESH_LOG_ERROR = "Failed to refresh token";

type RefreshResult =
    | {kind: "token"; token: string}
    /** The session is over (401/403 or no token in the response): the user has to sign in again. */
    | {kind: "rejected"}
    /** The session could not be checked (offline, 5xx, rate limit): signing out would be wrong. */
    | {kind: "unavailable"};

type FailedRefresh = Exclude<RefreshResult, {kind: "token"}>;

const REJECTED: FailedRefresh = {kind: "rejected"};
const UNAVAILABLE: FailedRefresh = {kind: "unavailable"};

let sharedRefresh: Promise<RefreshResult> | null = null;

function isSessionRejection(status: number): boolean {
    return status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN;
}

function readAccessToken(payload: unknown): string | null {
    if (typeof payload !== "object" || payload === null) return null;
    const token = ("accessToken" in payload && payload.accessToken) || ("access_token" in payload && payload.access_token);
    return typeof token === "string" && token.length > 0 ? token : null;
}

async function requestAccessToken(): Promise<RefreshResult> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOKEN_REFRESH}`, {
            method: "POST",
            credentials: "include",
        });
        if (!response.ok) return isSessionRejection(response.status) ? REJECTED : UNAVAILABLE;

        const token = readAccessToken(await response.json());
        if (token === null) return REJECTED;
        useAuthStore.getState().setAccessToken(token);
        return {kind: "token", token};
    } catch (error) {
        logger.error(REFRESH_LOG_ERROR, error);
        return UNAVAILABLE;
    }
}

function redirectToLogin(): void {
    if (typeof window !== "undefined") {
        window.location.href = ROUTES.LOGIN;
    }
}

async function refreshSession(): Promise<RefreshResult> {
    const result = await requestAccessToken();
    if (result.kind === "rejected") {
        clearSessionHint();
        redirectToLogin();
    }
    return result;
}

/** Every caller that needs a new token while a refresh is running waits for that same refresh. */
function refreshSessionOnce(): Promise<RefreshResult> {
    sharedRefresh ??= refreshSession().finally(() => {
        sharedRefresh = null;
    });
    return sharedRefresh;
}

function resolveAccessToken(): Promise<RefreshResult> {
    const token = useAuthStore.getState().accessToken;
    if (token) return Promise.resolve({kind: "token", token});
    return refreshSessionOnce();
}

function resolveTokenAfterRejection(rejectedToken: string): Promise<RefreshResult> {
    const currentToken = useAuthStore.getState().accessToken;
    // Another request refreshed while this one was in flight: retry with its token instead of refreshing again.
    if (currentToken && currentToken !== rejectedToken) return Promise.resolve({kind: "token", token: currentToken});
    return refreshSessionOnce();
}

function respondToFailedRefresh(result: FailedRefresh, unauthorizedResponse?: Response): Response {
    if (result.kind === "unavailable") return new Response(null, {status: HTTP_SERVICE_UNAVAILABLE});
    return unauthorizedResponse ?? new Response(null, {status: HTTP_UNAUTHORIZED});
}

function isLogoutRequest(endpoint: string, method: string | undefined): boolean {
    return endpoint === API_ENDPOINTS.USERS_SESSIONS_CURRENT && method === "DELETE";
}

function buildHeaders(options: RequestInit, token: string | null): Headers {
    const headers = new Headers(options.headers);
    if (typeof options.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", JSON_CONTENT_TYPE);
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
}

function sendRequest(endpoint: string, options: RequestInit, token: string | null): Promise<Response> {
    return fetch(`${API_BASE_URL}${endpoint}`, {...options, headers: buildHeaders(options, token)});
}

async function retryWithNewToken(
    endpoint: string,
    options: RequestInit,
    rejectedToken: string,
    unauthorizedResponse: Response,
): Promise<Response> {
    const tokenResult = await resolveTokenAfterRejection(rejectedToken);
    if (tokenResult.kind !== "token") return respondToFailedRefresh(tokenResult, unauthorizedResponse);
    return sendRequest(endpoint, options, tokenResult.token);
}

/**
 * Sends an authenticated API request. A missing or expired access token is replaced through one refresh shared by
 * all concurrent callers. A rejected session redirects to login and answers 401; an unreachable refresh answers 503
 * without signing the user out.
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (isLogoutRequest(endpoint, options.method)) {
        return sendRequest(endpoint, options, useAuthStore.getState().accessToken);
    }

    const tokenResult = await resolveAccessToken();
    if (tokenResult.kind !== "token") return respondToFailedRefresh(tokenResult);

    const response = await sendRequest(endpoint, options, tokenResult.token);
    if (response.status !== HTTP_UNAUTHORIZED) return response;
    return retryWithNewToken(endpoint, options, tokenResult.token, response);
}
