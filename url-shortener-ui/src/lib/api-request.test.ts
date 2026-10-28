import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {ApiError, requestJson} from "@/lib/api-request";
import {describeHttpFailure} from "@/lib/errors";
import {HTTP_CONFLICT, HTTP_INTERNAL_SERVER_ERROR} from "@/lib/http-status";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const ENDPOINT = "/shortlinks";

describe("requestJson", () => {
    it("resolves with the parsed body and passes the request options on", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({content: []}));
        const controller = new AbortController();

        await expect(requestJson(ENDPOINT, {signal: controller.signal})).resolves.toEqual({content: []});
        expect(fetchWithAuth).toHaveBeenCalledWith(ENDPOINT, {signal: controller.signal});
    });

    it("rejects with an ApiError carrying the status and the problem detail", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "Key already taken."}, {status: HTTP_CONFLICT}));

        const error = await requestJson(ENDPOINT).catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({status: HTTP_CONFLICT, message: "Key already taken."});
    });

    it("falls back to plain wording for the status when the error body has no detail", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

        await expect(requestJson(ENDPOINT)).rejects.toMatchObject({
            status: HTTP_INTERNAL_SERVER_ERROR,
            message: describeHttpFailure(HTTP_INTERNAL_SERVER_ERROR),
        });
    });
});
