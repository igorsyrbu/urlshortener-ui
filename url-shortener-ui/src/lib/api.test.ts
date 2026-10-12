import {beforeEach, describe, expect, it, vi} from "vitest";
import {API_BASE_URL, fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useAuthStore} from "@/lib/store/auth";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn()}}));

const ACCESS_TOKEN = "access-token";
const REFRESHED_TOKEN = "refreshed-token";
const TEST_ENDPOINT = "/shortlinks";
const REFRESH_URL = `${API_BASE_URL}${API_ENDPOINTS.TOKEN_REFRESH}`;
const TEST_URL = `${API_BASE_URL}${TEST_ENDPOINT}`;

const fetchMock = vi.fn<typeof fetch>();
let locationStub: {href: string};

function authorizationOf(call: number): string | null {
    return new Headers(fetchMock.mock.calls[call][1]?.headers).get("Authorization");
}

function mockRefreshEndpoint(respond: () => Response | Promise<Response>): void {
    fetchMock.mockImplementation(async (input) => {
        if (input === REFRESH_URL) return respond();
        return new Response(null, {status: 200});
    });
}

function refreshCallCount(): number {
    return fetchMock.mock.calls.filter(([url]) => url === REFRESH_URL).length;
}

describe("fetchWithAuth", () => {
    beforeEach(() => {
        fetchMock.mockReset();
        locationStub = {href: ""};
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("window", {location: locationStub});
        useAuthStore.setState({accessToken: ACCESS_TOKEN, user: null});
    });

    describe("authenticated requests", () => {
        it("sends the bearer token with a JSON content type and returns the response", async () => {
            const expected = Response.json({id: "1"});
            fetchMock.mockResolvedValueOnce(expected);

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response).toBe(expected);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(TEST_URL, {
                headers: {"Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}`},
            });
        });

        it("forwards the method and body untouched", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, {status: 201}));
            const body = JSON.stringify({url: "https://example.com"});

            await fetchWithAuth(TEST_ENDPOINT, {method: "POST", body});

            expect(fetchMock).toHaveBeenCalledWith(TEST_URL, expect.objectContaining({method: "POST", body}));
        });

        it("merges caller headers and lets them override the defaults", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null));

            await fetchWithAuth(TEST_ENDPOINT, {headers: {"X-Custom": "value", "Content-Type": "text/csv"}});

            expect(fetchMock.mock.calls[0][1]?.headers).toEqual({
                "Content-Type": "text/csv",
                "X-Custom": "value",
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            });
        });

        it("returns non-401 error responses without refreshing the token", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, {status: 500}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(500);
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
            let finishRefresh: (response: Response) => void = () => undefined;
            mockRefreshEndpoint(() => new Promise<Response>((resolve) => { finishRefresh = resolve; }));

            const requests = Promise.all([fetchWithAuth("/a"), fetchWithAuth("/b"), fetchWithAuth("/c")]);
            await vi.waitFor(() => expect(refreshCallCount()).toBe(1));
            finishRefresh(Response.json({accessToken: REFRESHED_TOKEN}));
            const responses = await requests;

            expect(refreshCallCount()).toBe(1);
            expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
            expect(fetchMock).toHaveBeenCalledTimes(4);
        });

        it.each([
            ["the refresh endpoint rejects the session", () => new Response(null, {status: 401})],
            ["the refresh response has no token", () => Response.json({})],
        ])("redirects to login and returns 401 without calling the API when %s", async (_name, respond) => {
            mockRefreshEndpoint(respond);

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(401);
            expect(locationStub.href).toBe(ROUTES.LOGIN);
            expect(fetchMock).toHaveBeenCalledExactlyOnceWith(REFRESH_URL, expect.anything());
        });

        it("logs the failure, redirects to login and returns 401 when the refresh request throws", async () => {
            const networkError = new TypeError("Failed to fetch");
            fetchMock.mockRejectedValueOnce(networkError);

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(401);
            expect(locationStub.href).toBe(ROUTES.LOGIN);
            expect(logger.error).toHaveBeenCalledWith("Failed to refresh token", networkError);
        });

        it("does not redirect when there is no window to navigate", async () => {
            vi.stubGlobal("window", undefined);
            mockRefreshEndpoint(() => new Response(null, {status: 401}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(401);
            expect(locationStub.href).toBe("");
        });
    });

    describe("expired access token", () => {
        it("refreshes once on 401 and retries the request with the new token", async () => {
            const retried = Response.json({id: "1"});
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: 401}))
                .mockResolvedValueOnce(Response.json({accessToken: REFRESHED_TOKEN}))
                .mockResolvedValueOnce(retried);

            const response = await fetchWithAuth(TEST_ENDPOINT, {method: "PUT", body: "payload"});

            expect(response).toBe(retried);
            expect(fetchMock).toHaveBeenNthCalledWith(2, REFRESH_URL, {method: "POST", credentials: "include"});
            expect(fetchMock).toHaveBeenNthCalledWith(3, TEST_URL, {
                method: "PUT",
                body: "payload",
                headers: {"Content-Type": "application/json", Authorization: `Bearer ${REFRESHED_TOKEN}`},
            });
            expect(useAuthStore.getState().accessToken).toBe(REFRESHED_TOKEN);
        });

        it("returns the second 401 instead of retrying forever", async () => {
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: 401}))
                .mockResolvedValueOnce(Response.json({accessToken: REFRESHED_TOKEN}))
                .mockResolvedValueOnce(new Response(null, {status: 401}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(401);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it("redirects to login and returns the original 401 when the refresh fails", async () => {
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: 401}))
                .mockResolvedValueOnce(new Response(null, {status: 401}));

            const response = await fetchWithAuth(TEST_ENDPOINT);

            expect(response.status).toBe(401);
            expect(locationStub.href).toBe(ROUTES.LOGIN);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it("returns the 401 without a second refresh while another request is already refreshing", async () => {
            let finishRefresh: (response: Response) => void = () => undefined;
            let finishFirstRequest: (response: Response) => void = () => undefined;
            fetchMock.mockImplementation((input) => {
                if (input === REFRESH_URL) return new Promise<Response>((resolve) => { finishRefresh = resolve; });
                return new Promise<Response>((resolve) => { finishFirstRequest = resolve; });
            });
            const firstRequest = fetchWithAuth("/first");
            await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
            useAuthStore.setState({accessToken: null});
            const secondRequest = fetchWithAuth("/second");
            await vi.waitFor(() => expect(refreshCallCount()).toBe(1));

            finishFirstRequest(new Response(null, {status: 401}));
            const firstResponse = await firstRequest;
            finishRefresh(Response.json({accessToken: REFRESHED_TOKEN}));
            fetchMock.mockImplementation(async () => new Response(null, {status: 200}));
            await secondRequest;

            expect(firstResponse.status).toBe(401);
            expect(refreshCallCount()).toBe(1);
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
                {method: "DELETE", headers: {"Content-Type": "application/json"}},
            );
        });

        it("does not refresh and retry when the session is already gone", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, {status: 401}));

            const response = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_CURRENT, {method: "DELETE"});

            expect(response.status).toBe(401);
            expect(fetchMock).toHaveBeenCalledOnce();
            expect(locationStub.href).toBe("");
        });

        it("still refreshes on 401 for the same endpoint with a different method", async () => {
            fetchMock
                .mockResolvedValueOnce(new Response(null, {status: 401}))
                .mockResolvedValueOnce(Response.json({accessToken: REFRESHED_TOKEN}))
                .mockResolvedValueOnce(new Response(null, {status: 200}));

            const response = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_CURRENT);

            expect(response.status).toBe(200);
            expect(refreshCallCount()).toBe(1);
        });
    });
});
