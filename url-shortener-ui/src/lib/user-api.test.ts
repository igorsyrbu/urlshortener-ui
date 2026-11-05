import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {ApiError} from "@/lib/api-request";
import {API_ENDPOINTS} from "@/lib/constants";
import {HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NO_CONTENT, HTTP_OK, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {logger} from "@/lib/logger";
import type {UserProfile} from "@/lib/types";
import {
    fetchCurrentUser,
    fetchUserPreferences,
    fetchUserSessions,
    saveProfileName,
    saveUserPreferences,
    terminateCurrentSession,
    terminateOtherSessions,
    terminateSession,
} from "@/lib/user-api";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const USER: UserProfile = {email: "ada@example.com", name: "Ada"};

beforeEach(() => {
    vi.mocked(fetchWithAuth).mockReset();
});

describe("fetchCurrentUser", () => {
    it("requests the current user with the abort signal and returns the profile", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(USER));
        const {signal} = new AbortController();

        const user = await fetchCurrentUser(signal);

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME, {signal});
        expect(user).toEqual(USER);
    });

    it("rejects with an ApiError carrying the status when the request is unauthorized", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_UNAUTHORIZED}));

        await expect(fetchCurrentUser()).rejects.toMatchObject({name: ApiError.name, status: HTTP_UNAUTHORIZED});
    });
});

describe("saveProfileName", () => {
    it("sends the name with PUT and reports saved for a 2xx response", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_OK}));

        const outcome = await saveProfileName("Ada Lovelace");

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME_NAME, {
            method: "PUT",
            body: JSON.stringify({name: "Ada Lovelace"}),
        });
        expect(outcome).toBe("saved");
    });

    it("reports rejected for a non-2xx response", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_BAD_REQUEST}));

        expect(await saveProfileName("Ada")).toBe("rejected");
    });

    it("reports failed and logs the error when the request throws", async () => {
        const failure = new Error("network down");
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(failure);

        expect(await saveProfileName("Ada")).toBe("failed");
        expect(logger.error).toHaveBeenCalledWith("Error updating name", failure);
    });
});

describe("sessions", () => {
    it("loads the sessions", async () => {
        const sessions = [{id: "s-1", current: true}];
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(sessions));

        expect(await fetchUserSessions()).toEqual(sessions);
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_SESSIONS, {signal: undefined});
    });

    it.each([
        ["the current session", () => terminateCurrentSession(), API_ENDPOINTS.USERS_SESSIONS_CURRENT],
        ["one session", () => terminateSession("s-2"), API_ENDPOINTS.USERS_SESSION("s-2")],
        ["every other session", () => terminateOtherSessions(), API_ENDPOINTS.USERS_SESSIONS_OTHER],
    ])("deletes %s", async (_name, terminate, endpoint) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_NO_CONTENT}));

        await terminate();

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(endpoint, {method: "DELETE"});
    });

    it("rejects with an ApiError when the server refuses to end a session", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_FORBIDDEN}));

        await expect(terminateSession("s-2")).rejects.toMatchObject({name: "ApiError", status: HTTP_FORBIDDEN});
    });
});

describe("preferences", () => {
    it("loads the stored preferences as sent", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: "SUGGEST"}));

        expect(await fetchUserPreferences()).toEqual({urlCleanerMode: "SUGGEST"});
    });

    it("puts the preferences and returns what the server stored", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: "AUTO_CLEAN"}));

        const saved = await saveUserPreferences({urlCleanerMode: "AUTO_CLEAN"});

        expect(saved).toEqual({urlCleanerMode: "AUTO_CLEAN"});
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME_PREFERENCES, {
            method: "PUT", body: JSON.stringify({urlCleanerMode: "AUTO_CLEAN"}),
        });
    });
});
