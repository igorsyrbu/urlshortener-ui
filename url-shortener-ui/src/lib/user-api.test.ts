import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {ApiError} from "@/lib/api-request";
import {API_ENDPOINTS} from "@/lib/constants";
import {HTTP_BAD_REQUEST, HTTP_OK, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {logger} from "@/lib/logger";
import type {UserProfile} from "@/lib/types";
import {fetchCurrentUser, saveProfileName} from "@/lib/user-api";

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
