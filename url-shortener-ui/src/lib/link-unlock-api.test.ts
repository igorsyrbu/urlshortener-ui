import {describe, expect, it, vi} from "vitest";
import {API_BASE_URL} from "@/lib/api";
import {RATE_LIMIT_RETRY_AFTER_HEADER} from "@/lib/billing-constants";
import {API_ENDPOINTS} from "@/lib/constants";
import {HTTP_OK, HTTP_TOO_MANY_REQUESTS, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {unlockLink, UnlockLinkError} from "@/lib/link-unlock-api";

const PASSWORD = "secret-pass";
const DESTINATION = "https://example.com/page?utm_source=x";

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function sentForm(fetchMock: ReturnType<typeof vi.fn>): URLSearchParams {
    return new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body));
}

describe("unlockLink", () => {
    it("posts the password and captcha as a form, with the visitor's query string, without caching", async () => {
        const fetchMock = stubFetch(Response.json({longUrl: DESTINATION}));

        await expect(unlockLink("Guide 1", PASSWORD, "captcha-token", "?utm_source=x")).resolves.toBe(DESTINATION);

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            `${API_BASE_URL}${API_ENDPOINTS.SHORTLINK_UNLOCK("Guide 1")}?utm_source=x`,
            expect.objectContaining({
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                cache: "no-store",
            }),
        );
        expect(Object.fromEntries(sentForm(fetchMock))).toEqual({password: PASSWORD, "cf-turnstile-response": "captcha-token"});
    });

    it("leaves the captcha field out when there is no token", async () => {
        const fetchMock = stubFetch(Response.json({longUrl: DESTINATION}));

        await unlockLink("Guide", PASSWORD, null, "");

        expect(sentForm(fetchMock).has("cf-turnstile-response")).toBe(false);
    });

    it("rejects with the status and problem detail of a refusal", async () => {
        stubFetch(Response.json({detail: "Incorrect password."}, {status: HTTP_UNAUTHORIZED}));

        const error = await unlockLink("Guide", PASSWORD, null, "").catch((rejection: unknown) => rejection);

        expect(error).toBeInstanceOf(UnlockLinkError);
        expect(error).toMatchObject({status: HTTP_UNAUTHORIZED, message: "Incorrect password.", retryAfterSeconds: null});
    });

    it("reads the endpoint rate limit's retry delay", async () => {
        stubFetch(new Response(null, {status: HTTP_TOO_MANY_REQUESTS, headers: {[RATE_LIMIT_RETRY_AFTER_HEADER]: "42"}}));

        await expect(unlockLink("Guide", PASSWORD, null, "")).rejects.toMatchObject({retryAfterSeconds: 42});
    });

    it("rejects a success answer without a destination", async () => {
        stubFetch(Response.json({}, {status: HTTP_OK}));

        await expect(unlockLink("Guide", PASSWORD, null, "")).rejects.toBeInstanceOf(UnlockLinkError);
    });
});
