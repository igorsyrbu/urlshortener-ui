import {useAuthStore} from "@/lib/store/auth";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";

export const API_BASE_URL = "/api";
// ---------------------------------------------------------------------------
// Token refresh queue
// ---------------------------------------------------------------------------

interface QueueItem {
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null = null): void {
    for (const item of failedQueue) {
        if (error) {
            item.reject(error);
        } else {
            item.resolve(token);
        }
    }
    failedQueue = [];
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(): Promise<string | null> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOKEN_REFRESH}`, {
            method: "POST",
            credentials: "include",
        });

        if (!response.ok) return null;

        const data = await response.json();
        const newToken: string | undefined = data.accessToken || data.access_token;
        if (newToken) {
            useAuthStore.getState().setAccessToken(newToken);
        }
        return newToken ?? null;
    } catch (error) {
        console.error("Failed to refresh token", error);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redirectToLogin(): void {
    if (typeof window !== "undefined") {
        window.location.href = ROUTES.LOGIN;
    }
}

function isLogoutRequest(endpoint: string, method: string | undefined): boolean {
    return endpoint === API_ENDPOINTS.USERS_SESSIONS_CURRENT && method === "DELETE";
}

function buildHeaders(options: RequestInit, token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

// ---------------------------------------------------------------------------
// Ensure the auth store has a valid access token before making a request.
// If the token is missing, triggers a refresh. If already refreshing, queues.
// Returns `false` when authentication cannot be recovered.
// ---------------------------------------------------------------------------

async function ensureValidToken(isLogout: boolean): Promise<boolean> {
    const token = useAuthStore.getState().accessToken;
    if (token || isLogout) return true;

    if (!isRefreshing) {
        isRefreshing = true;
        try {
            const newToken = await refreshAccessToken();
            isRefreshing = false;
            processQueue(null, newToken);

            if (!newToken) {
                redirectToLogin();
                return false;
            }
        } catch (e) {
            processQueue(e, null);
            isRefreshing = false;
            redirectToLogin();
            return false;
        }
    } else {
        try {
            await new Promise<string | null>((resolve, reject) => {
                failedQueue.push({resolve, reject});
            });
        } catch {
            return false;
        }
    }

    return true;
}

// ---------------------------------------------------------------------------
// Retry the original request once after a 401 response.
// ---------------------------------------------------------------------------

async function retryOnUnauthorized(
    endpoint: string,
    options: RequestInit,
    headers: Record<string, string>,
): Promise<Response | null> {
    if (isRefreshing) return null;

    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;

    if (!newToken) {
        redirectToLogin();
        return null;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {...headers, Authorization: `Bearer ${newToken}`},
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchWithAuth(
    endpoint: string,
    options: RequestInit = {},
): Promise<Response> {
    const isLogout = isLogoutRequest(endpoint, options.method);

    const tokenValid = await ensureValidToken(isLogout);
    if (!tokenValid) {
        return new Response(null, {status: 401});
    }

    const currentToken = useAuthStore.getState().accessToken;
    const headers = buildHeaders(options, currentToken);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401 && !isLogout) {
        const retryResponse = await retryOnUnauthorized(endpoint, options, headers);
        if (retryResponse) return retryResponse;
    }

    return response;
}
