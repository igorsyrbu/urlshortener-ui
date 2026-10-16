import {describe, expect, it} from "vitest";
import {getDomain, getShortKeyValidationError, isValidUrl, normalizeUrl} from "@/lib/url-utils";

const SHORT_KEY_MAX_LENGTH = 30;

describe("getDomain", () => {
    it.each([
        ["https://www.example.com/path?q=1", "www.example.com"],
        ["http://example.com:8080/", "example.com"],
        ["https://user:pass@example.com", "example.com"],
        ["http://192.168.0.1/x", "192.168.0.1"],
    ])("extracts the hostname from %s", (url, expected) => {
        expect(getDomain(url)).toBe(expected);
    });

    it("throws for a malformed URL", () => {
        expect(() => getDomain("not a url")).toThrow();
    });
});

describe("isValidUrl", () => {
    it.each([
        "https://example.com",
        "http://example.com/path?x=1#hash",
        "https://localhost:3000",
        "HTTPS://EXAMPLE.COM",
    ])("accepts %s", (value) => {
        expect(isValidUrl(value)).toBe(true);
    });

    it.each([
        ["a bare domain", "example.com"],
        ["an empty string", ""],
        ["an ftp URL", "ftp://example.com"],
        ["a javascript URL", "javascript:alert(1)"],
        ["a data URL", "data:text/plain,hello"],
        ["a mailto URL", "mailto:user@example.com"],
        ["a scheme without a host", "https://"],
    ])("rejects %s", (_name, value) => {
        expect(isValidUrl(value)).toBe(false);
    });
});

describe("normalizeUrl", () => {
    it.each([
        ["a bare domain", "google.com", "https://google.com"],
        ["a bare domain with a path", "example.com/a/b?x=1", "https://example.com/a/b?x=1"],
        ["a subdomain starting with a digit", "3d.example.com", "https://3d.example.com"],
        ["surrounding whitespace", "  example.com  ", "https://example.com"],
    ])("prepends https:// to %s", (_name, value, expected) => {
        expect(normalizeUrl(value)).toBe(expected);
    });

    it.each([
        ["an https URL", "https://example.com"],
        ["an http URL", "http://example.com"],
        ["an upper-case scheme", "HTTPS://example.com"],
        ["a non-web scheme", "ftp://example.com"],
        ["a word without a dot", "localhost"],
        ["text starting with a symbol", ".example.com"],
        ["an empty string", ""],
    ])("leaves %s unchanged", (_name, value) => {
        expect(normalizeUrl(value)).toBe(value);
    });

    it("trims whitespace even when nothing else changes", () => {
        expect(normalizeUrl("  https://example.com ")).toBe("https://example.com");
    });

    it("does not validate its output", () => {
        expect(normalizeUrl("hello world.foo")).toBe("https://hello world.foo");
    });

    it("leaves a non-web URL for validation to reject", () => {
        expect(isValidUrl(normalizeUrl("ftp://example.com"))).toBe(false);
    });
});

describe("getShortKeyValidationError", () => {
    it.each(["abc", "ABC-123", "a", "-", "x".repeat(SHORT_KEY_MAX_LENGTH)])("accepts %s", (key) => {
        expect(getShortKeyValidationError(key)).toBeNull();
    });

    it.each(["", "   "])("treats blank input %j as no key", (key) => {
        expect(getShortKeyValidationError(key)).toBeNull();
    });

    it("ignores surrounding whitespace", () => {
        expect(getShortKeyValidationError("  abc  ")).toBeNull();
    });

    it.each(["has space", "under_score", "dot.dot", "slash/key", "emoji😀", "żółw"])("rejects the forbidden characters in %s", (key) => {
        expect(getShortKeyValidationError(key)).toBe("Key can only contain letters, numbers, and hyphens.");
    });

    it("rejects keys longer than the maximum length", () => {
        expect(getShortKeyValidationError("x".repeat(SHORT_KEY_MAX_LENGTH + 1))).toBe("Key must be 30 characters or fewer.");
    });

    it("reports forbidden characters before the length", () => {
        expect(getShortKeyValidationError("_".repeat(SHORT_KEY_MAX_LENGTH + 1))).toBe("Key can only contain letters, numbers, and hyphens.");
    });
});
