import {describe, expect, it} from "vitest";
import {parseProblemDetail, readProblemDetail} from "@/lib/problem-details";

const FALLBACK_LENGTH_LIMIT = 200;

describe("parseProblemDetail", () => {
    it.each([
        ["detail", {detail: "Detailed reason", message: "m", title: "t"}, "Detailed reason"],
        ["message when detail is missing", {message: "Message text", title: "t"}, "Message text"],
        ["error over the generic title", {error: "Error text", title: "Bad Request"}, "Error text"],
        ["title when nothing else is there", {title: "Title text"}, "Title text"],
        ["the first non-blank field", {detail: "   ", message: "Message text"}, "Message text"],
        ["a trimmed value", {detail: "  padded  "}, "padded"],
    ])("prefers %s", (_name, body, expected) => {
        expect(parseProblemDetail(JSON.stringify(body), 400)).toBe(expected);
    });

    it.each([
        ["an empty body", ""],
        ["a blank body", "   "],
        ["a JSON array without fields", "[1]"],
        ["a JSON primitive", "42"],
        ["JSON null", "null"],
        ["an object without known fields", '{"other":"x"}'],
        ["an object with non-string fields", '{"detail":5}'],
        ["a plain-text body over the inline limit", "x".repeat(FALLBACK_LENGTH_LIMIT + 1)],
    ])("falls back to the status for %s", (_name, body) => {
        expect(parseProblemDetail(body, 418)).toBe("Request failed: 418");
    });

    it("surfaces a short plain-text body", () => {
        expect(parseProblemDetail("  Bad gateway  ", 502)).toBe("Bad gateway");
    });

    it("surfaces a plain-text body at the inline limit", () => {
        const body = "x".repeat(FALLBACK_LENGTH_LIMIT);

        expect(parseProblemDetail(body, 500)).toBe(body);
    });
});

describe("readProblemDetail", () => {
    it("reads the detail of a problem-details body", () => {
        expect(readProblemDetail({type: "about:blank", title: "Unprocessable Entity", status: 422, detail: "valid reason is required"}))
            .toBe("valid reason is required");
    });

    it.each([null, 42, "text", {}, {detail: ""}])("has no detail for %j", (body) => {
        expect(readProblemDetail(body)).toBeNull();
    });
});
