import {describe, expect, it} from "vitest";
import {RATE_LIMIT_RETRY_AFTER_HEADER} from "@/lib/billing-constants";
import {parseRetryAfterSeconds, RETRY_AFTER_HEADER} from "@/lib/retry-after";

function headersWithRetryAfter(value: string): Headers {
    return new Headers({[RETRY_AFTER_HEADER]: value});
}

describe("parseRetryAfterSeconds", () => {
    it("returns null when the header is missing", () => {
        expect(parseRetryAfterSeconds(new Headers())).toBeNull();
    });

    it("returns null when the header is empty", () => {
        expect(parseRetryAfterSeconds(headersWithRetryAfter(""))).toBeNull();
    });

    it("parses a number of seconds", () => {
        expect(parseRetryAfterSeconds(headersWithRetryAfter("30"))).toBe(30);
    });

    it("parses the smallest positive delay", () => {
        expect(parseRetryAfterSeconds(headersWithRetryAfter("1"))).toBe(1);
    });

    it("ignores trailing text after the number", () => {
        expect(parseRetryAfterSeconds(headersWithRetryAfter("45 seconds"))).toBe(45);
    });

    it.each(["0", "-5"])("returns null for the non-positive value %s", (value) => {
        expect(parseRetryAfterSeconds(headersWithRetryAfter(value))).toBeNull();
    });

    it.each(["soon", "Wed, 21 Oct 2026 07:28:00 GMT"])("returns null for the unparsable value %s", (value) => {
        expect(parseRetryAfterSeconds(headersWithRetryAfter(value))).toBeNull();
    });

    it("reads a custom header when one is named", () => {
        const headers = new Headers({[RATE_LIMIT_RETRY_AFTER_HEADER]: "15", [RETRY_AFTER_HEADER]: "99"});

        expect(parseRetryAfterSeconds(headers, RATE_LIMIT_RETRY_AFTER_HEADER)).toBe(15);
    });
});
