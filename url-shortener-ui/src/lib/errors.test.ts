import {describe, expect, it} from "vitest";
import {describeHttpFailure, describeRequestError, ERROR_COPY} from "@/lib/errors";

describe("describeHttpFailure", () => {
    it.each([
        [400, ERROR_COPY.BAD_REQUEST],
        [401, ERROR_COPY.UNAUTHORIZED],
        [403, ERROR_COPY.FORBIDDEN],
        [404, ERROR_COPY.NOT_FOUND],
        [408, ERROR_COPY.TIMEOUT],
        [409, ERROR_COPY.CONFLICT],
        [413, ERROR_COPY.TOO_LARGE],
        [429, ERROR_COPY.RATE_LIMITED],
        [500, ERROR_COPY.SERVER],
        [502, ERROR_COPY.SERVER],
        [504, ERROR_COPY.TIMEOUT],
        [418, ERROR_COPY.UNKNOWN],
    ])("describes %i without showing the code", (status, expected) => {
        const text = describeHttpFailure(status);

        expect(text).toBe(expected);
        expect(text).not.toContain(String(status));
    });
});

describe("describeRequestError", () => {
    it("blames the connection when fetch could not reach the server", () => {
        expect(describeRequestError(new TypeError("Failed to fetch"))).toBe(ERROR_COPY.NETWORK);
    });

    it("falls back to a generic message for anything else", () => {
        expect(describeRequestError(new SyntaxError("Unexpected token"))).toBe(ERROR_COPY.UNKNOWN);
        expect(describeRequestError("boom")).toBe(ERROR_COPY.UNKNOWN);
    });
});
