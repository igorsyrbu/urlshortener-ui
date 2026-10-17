import {beforeEach, describe, expect, it, vi} from "vitest";
import {API_BASE_URL, fetchWithAuth, HTTP_SERVICE_UNAVAILABLE, HTTP_UNAUTHORIZED} from "@/lib/api";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useAuthStore} from "@/lib/store/auth";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn()}}));

const ACCESS_TOKEN = "access-token";
const REFRESHED_TOKEN = "refreshed-token";
const TEST_ENDPOINT = "/shortlinks";
const REFRESH_URL = `${API_BASE_URL}${API_ENDPOINTS.TOKEN_REFRESH}`;
const TEST_URL = `${API_BASE_URL}${TEST_ENDPOINT}`;
const CONCURRENT_ENDPOINTS = ["/a", "/b", "/c"];
const HTTP_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const fetchMock = vi.fn<typeof fetch>();
const loginRedirects = vi.fn<(href: string) => void>();

function headersOf(call: number): Headers {
    return new Headers(fetchMock.mock.calls[call][1]?.headers);
}

function authorizationOf(call: number): string | null {
    return headersOf(call).get("Authorization");
}

function apiCalls(): string[] {
    return fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url !== REFRESH_URL);
}

function refreshCallCount(): number {
    return fetchMock.mock.calls.filter(([url]) => url === REFRESH_URL).length;
}

function mockRefreshEndpoint(respond: () => Response | Promise<Response>): void {
    fetchMock.mockImplementation(async (input) => {
        if (input === REFRESH_URL) return respond();
        return new Response(null, {status: HTTP_OK});
    });
}

/** The API answers 401 to the current token and 200 to the refreshed one; the refresh waits until released. */
function mockExpiredTokenWithPendingRefresh(): (response: Response) => void {
    const refresh = Promise.withResolvers<Response>();
    fetchMock.mockImplementation(async (input, init) => {
        if (input === REFRESH_URL) return refresh.promise;
        const isRefreshedToken = new Headers(init?.headers).get("Authorization") === `Bearer ${REFRESHED_TOKEN}`;
        return new Response(null, {status: isRefreshedToken ? HTTP_OK : HTTP_UNAUTHORIZED});
    });
    return refresh.resolve;
}

function stubWindowLocation(): void {
    const location = {
        set href(value: string) {
            loginRedirects(value);
        },
    };
    vi.stubGlobal("window", {location});
}

describe("fetchWithAuth", () => {
    beforeEach(() => {
        fetchMock.mockReset();
        loginRedirects.mockReset();
        vi.stubGlobal("fetch", fetchMock);
        stubWindowLocation();
        useAuthStore.setState({accessToken: ACCESS_TOKEN, user: null});
    });

    describe("authenticated requests", () => {
        it("sends the bearer token and returns the response", async () => {
            const expected = Response.json({id: "1"});
            fetchMock.mockResolvedValueOnce(expected);

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response).toBe(expected);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(TEST_URL, expect.anything());
            expect(authorizationOf(0)).toBe(`Bearer ${ACCESS_TOKEN}`);
        });

        it("sends no content type with a request that has no body", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null));

            await fetchWithAuth(TEST_ENDPOINT);

            expect(headersOf(0).has("Content-Type")).toBe(false);
        });

        it("marks a string body as JSON and forwards the method and body untouched", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, {status: 201}));
            const body = JSON.stringify({url: "https://example.com"});

            await fetchWithAuth(TEST_ENDPOINT, {method: "POST", body});

            expect(fetchMock).toHaveBeenCalledWith(TEST_URL, expect.objectContaining({method: "POST", body}));
            expect(headersOf(0).get("Content-Type")).toBe("application/json");
        });

        it("keeps caller headers, including a content type of their own", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null));

            await fetchWithAuth(TEST_ENDPOINT, {body: "a,b", headers: {"X-Custom": "value", "Content-Type": "text/csv"}});

            expect(headersOf(0).get("Content-Type")).toBe("text/csv");
            expect(headersOf(0).get("X-Custom")).toBe("value");
            expect(authorizationOf(0)).toBe(`Bearer ${ACCESS_TOKEN}`);
        });

        it("returns non-401 error responses without refreshing the token", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_INTERNAL_SERVER_ERROR);
            expect(fetchMock).toHaveBeenCalledOnce();
        });
    });

    describe("missing access token", () => {
        beforeEach(() => {
            useAuthStore.setState({accessToken: null});
        });

        it("refreshes through the cookie session before sending the request", async () => {
            mockRefreshEndpoint(() => Response.json({accessToken: REFRESHED_TOKEN}));

            await fetchWithAuth(TEST_ENDPOINT);

            expect(fetchMock).toHaveBeenNthCalledWith(1, REFRESH_URL, {method: "POST", credentials: "include"});
            expect(authorizationOf(1)).toBe(`Bearer ${REFRESHED_TOKEN}`);
            expect(useAuthStore.getState().accessToken).toBe(REFRESHED_TOKEN);
        });

        it("accepts a snake_case access_token in the refresh response", async () => {
            mockRefreshEndpoint(() => Response.json({access_token: REFRESHED_TOKEN}));

            await fetchWithAuth(TEST_ENDPOINT);

            expect(useAuthStore.getState().accessToken).toBe(REFRESHED_TOKEN);
        });

        it("shares a single refresh between concurrent requests", async () => {
            const refresh = Promise.withResolvers<Response>();
            mockRefreshEndpoint(() => refresh.promise);

            const requests = Promise.all(CONCURRENT_ENDPOINTS.map((endpoint) => fetchWithAuth(endpoint)));
            await vi.waitFor(() => expect(refreshCallCount()).toBe(1));
            refresh.resolve(Response.json({accessToken: REFRESHED_TOKEN}));
            const responses = await requests;

            expect(refreshCallCount()).toBe(1);
            expect(responses.map((response) => response.status)).toEqual([HTTP_OK, HTTP_OK, HTTP_OK]);
            expect(apiCalls()).toHaveLength(CONCURRENT_ENDPOINTS.length);
        });

        it.each([
            ["the refresh endpoint rejects the session", () => new Response(null, {status: HTTP_UNAUTHORIZED})],
            ["the refresh endpoint forbids the session", () => new Response(null, {status: 403})],
            ["the refresh response has no token", () => Response.json({})],
        ])("redirects to login and returns 401 without calling the API when %s", async (_name, respond) => {
            mockRefreshEndpoint(respond);

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_UNAUTHORIZED);
            expect(loginRedirects).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(REFRESH_URL, expect.anything());
        });

        it("refreshes once, sends no request and redirects once when a shared refresh is rejected", async () => {
            mockRefreshEndpoint(() => new Response(null, {status: HTTP_UNAUTHORIZED}));

            const responses = await Promise.all(CONCURRENT_ENDPOINTS.map((endpoint) => fetchWithAuth(endpoint)));

            expect(responses.map((response) => response.status))
                .toEqual([HTTP_UNAUTHORIZED, HTTP_UNAUTHORIZED, HTTP_UNAUTHORIZED]);
            expect(refreshCallCount()).toBe(1);
            expect(apiCalls()).toEqual([]);
            expect(loginRedirects).toHaveBeenCalledOnce();
        });

        it("logs the failure and returns 503 without signing out when the refresh request throws", async () => {
            const networkError = new TypeError("Failed to fetch");
            fetchMock.mockRejectedValueOnce(networkError);

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_SERVICE_UNAVAILABLE);
            expect(loginRedirects).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith("Failed to refresh token", networkError);
        });

        it.each([
            ["a server error", HTTP_INTERNAL_SERVER_ERROR],
            ["a rate limit", 429],
        ])("returns 503 without signing out when the refresh answers with %s", async (_name, status) => {
            mockRefreshEndpoint(() => new Response(null, {status}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_SERVICE_UNAVAILABLE);
            expect(loginRedirects).not.toHaveBeenCalled();
            expect(apiCalls()).toEqual([]);
        });

        it("does not redirect when there is no window to navigate", async () => {
            vi.stubGlobal("window", undefined);
            mockRefreshEndpoint(() => new Response(null, {status: HTTP_UNAUTHORIZED}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_UNAUTHORIZED);
            expect(loginRedirects).not.toHaveBeenCalled();
        });
    });

    describe("expired access token", () => {
        it("refreshes once on 401 and retries the request with the new token", async () => {
            const retried = Response.json({id: "1"});
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}))
                .mockResolvedValueOnce(Response.json({accessToken: REFRESHED_TOKEN}))
                .mockResolvedValueOnce(retried);

            const response = await fetchWithAuth(TEST_ENDPOINT, {method: "PUT", body: "payload"});

            expect(response).toBe(retried);
            expect(fetchMock).toHaveBeenNthCalledWith(2, REFRESH_URL, {method: "POST", credentials: "include"});
            expect(fetchMock).toHaveBeenNthCalledWith(3, TEST_URL, expect.objectContaining({method: "PUT", body: "payload"}));
            expect(authorizationOf(2)).toBe(`Bearer ${REFRESHED_TOKEN}`);
            expect(useAuthStore.getState().accessToken).toBe(REFRESHED_TOKEN);
        });

        it("returns the second 401 instead of retrying forever", async () => {
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}))
                .mockResolvedValueOnce(Response.json({accessToken: REFRESHED_TOKEN}))
                .mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_UNAUTHORIZED);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it("redirects to login and returns the original 401 when the refresh fails", async () => {
            const unauthorized = new Response(null, {status: HTTP_UNAUTHORIZED});
            fetchMock
                .mockResolvedValueOnce(unauthorized)
                .mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response).toBe(unauthorized);
            expect(loginRedirects).toHaveBeenCalledExactlyOnceWith(ROUTES.LOGIN);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it("retries every concurrent 401 after one shared refresh", async () => {
            const releaseRefresh = mockExpiredTokenWithPendingRefresh();

            const requests = Promise.all(CONCURRENT_ENDPOINTS.map((endpoint) => fetchWithAuth(endpoint)));
            await vi.waitFor(() => expect(refreshCallCount()).toBe(1));
            releaseRefresh(Response.json({accessToken: REFRESHED_TOKEN}));
            const responses = await requests;

            expect(responses.map((response) => response.status)).toEqual([HTTP_OK, HTTP_OK, HTTP_OK]);
            expect(refreshCallCount()).toBe(1);
        });

        it("retries with a token another request refreshed meanwhile, without refreshing again", async () => {
            const firstResponse = Promise.withResolvers<Response>();
            fetchMock.mockImplementation(async (input) => {
                if (input === TEST_URL) return firstResponse.promise;
                return new Response(null, {status: HTTP_OK});
            });
            const request = fetchWithAuth(TEST_ENDPOINT);
            await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

            useAuthStore.setState({accessToken: REFRESHED_TOKEN});
            fetchMock.mockImplementation(async () => new Response(null, {status: HTTP_OK}));
            firstResponse.resolve(new Response(null, {status: HTTP_UNAUTHORIZED}));
            const response = await request;

            expect(response.status).toBe(HTTP_OK);
            expect(refreshCallCount()).toBe(0);
            expect(authorizationOf(1)).toBe(`Bearer ${REFRESHED_TOKEN}`);
        });

        it("returns 503 without signing out when the refresh after a 401 cannot reach the server", async () => {
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}))
                .mockRejectedValueOnce(new TypeError("Failed to fetch"));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(HTTP_SERVICE_UNAVAILABLE);
            expect(loginRedirects).not.toHaveBeenCalled();
        });
    });

    describe("logout request", () => {
        it("is sent without refreshing or authorization when no token is stored", async () => {
            useAuthStore.setState({accessToken: null});
            fetchMock.mockResolvedValueOnce(new Response(null, {status: 204}));

            const response = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_CURRENT, {method: "DELETE"});

            expect(response.status).toBe(204);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
                `${API_BASE_URL}${API_ENDPOINTS.USERS_SESSIONS_CURRENT}`,
                expect.objectContaining({method: "DELETE"}),
            );
            expect(authorizationOf(0)).toBeNull();
        });

        it("does not refresh and retry when the session is already gone", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}));

            const response = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_CURRENT, {method: "DELETE"});

            expect(response.status).toBe(HTTP_UNAUTHORIZED);
            expect(fetchMock).toHaveBeenCalledOnce();
            expect(loginRedirects).not.toHaveBeenCalled();
        });

        it("still refreshes on 401 for the same endpoint with a different method", async () => {
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}))
                .mockResolvedValueOnce(Response.json({accessToken: REFRESHED_TOKEN}))
                .mockResolvedValueOnce(new Response(null, {status: HTTP_OK}));

            const response = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_CURRENT);

            expect(response.status).toBe(HTTP_OK);
            expect(refreshCallCount()).toBe(1);
        });
    });
});
