import {describe, expect, it} from "vitest";
import {parseRetryAfter} from "@/components/abuse/report-abuse-utils";

function headersWithRetryAfter(value: string): Headers {
    return new Headers({"Retry-After": value});
}

describe("parseRetryAfter", () => {
    it("returns null when the header is missing", () => {
        expect(parseRetryAfter(new Headers())).toBeNull();
    });

    it("returns null when the header is empty", () => {
        expect(parseRetryAfter(headersWithRetryAfter(""))).toBeNull();
    });

    it("parses a number of seconds", () => {
        expect(parseRetryAfter(headersWithRetryAfter("30"))).toBe(30);
    });

    it("parses the smallest positive delay", () => {
        expect(parseRetryAfter(headersWithRetryAfter("1"))).toBe(1);
    });

    it("ignores trailing text after the number", () => {
        expect(parseRetryAfter(headersWithRetryAfter("45 seconds"))).toBe(45);
    });

    it.each(["0", "-5"])("returns null for the non-positive value %s", (value) => {
        expect(parseRetryAfter(headersWithRetryAfter(value))).toBeNull();
    });

    it.each(["soon", "Wed, 21 Oct 2026 07:28:00 GMT"])("returns null for the unparsable value %s", (value) => {
        expect(parseRetryAfter(headersWithRetryAfter(value))).toBeNull();
    });
});
