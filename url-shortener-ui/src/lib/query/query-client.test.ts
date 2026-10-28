import {describe, expect, it} from "vitest";
import {ApiError} from "@/lib/api-request";
import {HTTP_BAD_REQUEST, HTTP_NOT_FOUND, HTTP_REQUEST_TIMEOUT, HTTP_SERVICE_UNAVAILABLE, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {shouldRetryQuery} from "@/lib/query/query-client";

describe("shouldRetryQuery", () => {
    it.each([HTTP_SERVICE_UNAVAILABLE, HTTP_REQUEST_TIMEOUT])("retries a %i response", (status) => {
        expect(shouldRetryQuery(0, new ApiError(status, "temporary"))).toBe(true);
    });

    it("retries a network failure", () => {
        expect(shouldRetryQuery(0, new TypeError("Failed to fetch"))).toBe(true);
    });

    it.each([HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_NOT_FOUND])("does not retry a %i response", (status) => {
        expect(shouldRetryQuery(0, new ApiError(status, "client error"))).toBe(false);
    });

    it("stops after two retries", () => {
        expect(shouldRetryQuery(1, new TypeError("Failed to fetch"))).toBe(true);
        expect(shouldRetryQuery(2, new TypeError("Failed to fetch"))).toBe(false);
    });
});
