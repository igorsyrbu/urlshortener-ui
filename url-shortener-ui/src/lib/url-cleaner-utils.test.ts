import {describe, expect, it} from "vitest";
import {buildFinalUrl, buildTrackerEntries, getBaseUrl, TrackerEntry} from "@/lib/url-cleaner-utils";

function createEntry(overrides: Partial<TrackerEntry> & Pick<TrackerEntry, "key">): TrackerEntry {
    const value = overrides.value ?? "1";
    return {value, display: `${overrides.key}=${value}`, location: "query", ...overrides};
}

describe("buildTrackerEntries", () => {
    it("returns nothing when no parameter was removed", () => {
        expect(buildTrackerEntries("https://example.com/?a=1", [])).toEqual([]);
    });

    it("reads removed query parameters with their values", () => {
        const entries = buildTrackerEntries("https://example.com/page?utm_source=news&id=5&utm_medium=email", ["utm_source", "utm_medium"]);

        expect(entries).toEqual([
            {key: "utm_source", value: "news", display: "utm_source=news", location: "query"},
            {key: "utm_medium", value: "email", display: "utm_medium=email", location: "query"},
        ]);
    });

    it("displays a valueless parameter by its key only", () => {
        const entries = buildTrackerEntries("https://example.com/?fbclid", ["fbclid"]);

        expect(entries).toEqual([{key: "fbclid", value: "", display: "fbclid", location: "query"}]);
    });

    it("keeps the first value of a repeated parameter", () => {
        const entries = buildTrackerEntries("https://example.com/?ref=a&ref=b", ["ref"]);

        expect(entries[0].value).toBe("a");
    });

    it("falls back to an empty value for a parameter that is not in the URL", () => {
        const entries = buildTrackerEntries("https://example.com/?a=1", ["gclid"]);

        expect(entries).toEqual([{key: "gclid", value: "", display: "gclid", location: "query"}]);
    });

    it("finds parameters nested in a URL passed as q", () => {
        const inner = encodeURIComponent("https://target.com/?utm_campaign=spring");

        const entries = buildTrackerEntries(`https://google.com/url?q=${inner}`, ["utm_campaign"]);

        expect(entries[0]).toMatchObject({key: "utm_campaign", value: "spring", location: "query"});
    });

    it("prefers an outer parameter over a nested one with the same name", () => {
        const inner = encodeURIComponent("https://target.com/?ref=inner");

        const entries = buildTrackerEntries(`https://google.com/url?ref=outer&q=${inner}`, ["ref"]);

        expect(entries[0].value).toBe("outer");
    });

    it("ignores a q parameter that is not a URL", () => {
        const entries = buildTrackerEntries("https://example.com/?q=shoes&utm_source=x", ["utm_source"]);

        expect(entries[0].value).toBe("x");
    });

    it.each([
        ["a key=value segment", "https://amazon.com/dp/B001/ref=nav_logo", "ref", "nav_logo"],
        ["a key/value segment pair", "https://example.com/tracking/abc123/page", "tracking", "abc123"],
    ])("detects a tracker in %s as a path entry", (_name, url, key, value) => {
        const entries = buildTrackerEntries(url, [key]);

        expect(entries).toEqual([{key, value, display: `${key}=${value}`, location: "path"}]);
    });

    it.each([
        ["a key=value segment", "https://example.com/shop/ref=a%20b"],
        ["a key/value segment pair", "https://example.com/shop/ref/a%20b"],
        ["a key=value segment followed by more parameters", "https://example.com/shop/ref=a%20b&x=1"],
    ])("decodes the value of %s the same way", (_name, url) => {
        const [entry] = buildTrackerEntries(url, ["ref"]);

        expect(entry.value).toMatch(/^a b/);
    });

    it("keeps a malformed escape sequence as typed instead of throwing", () => {
        const entries = buildTrackerEntries("https://example.com/shop/ref=%E0%A4%A", ["ref"]);

        expect(entries).toEqual([{key: "ref", value: "%E0%A4%A", display: "ref=%E0%A4%A", location: "path"}]);
    });

    it("works with a relative or malformed URL", () => {
        const entries = buildTrackerEntries("/shop/ref=abc?x=1#frag", ["ref"]);

        expect(entries).toEqual([{key: "ref", value: "abc", display: "ref=abc", location: "path"}]);
    });
});

describe("getBaseUrl", () => {
    it.each([
        ["https://example.com/a/b?x=1#h", "https://example.com/a/b"],
        ["https://example.com", "https://example.com/"],
        ["http://localhost:3000/path/", "http://localhost:3000/path/"],
    ])("strips query and hash from %s", (url, expected) => {
        expect(getBaseUrl(url)).toBe(expected);
    });

    it("strips the query from a string that is not an absolute URL", () => {
        expect(getBaseUrl("example.com/path?x=1")).toBe("example.com/path");
    });
});

describe("buildFinalUrl", () => {
    const DIRTY = "https://example.com/page?id=5&utm_source=news&utm_medium=email&lang=en";
    const CLEANED = "https://example.com/page?id=5&lang=en";
    const entries = [
        createEntry({key: "utm_source", value: "news"}),
        createEntry({key: "utm_medium", value: "email"}),
    ];

    it("returns the cleaned URL when nothing is kept", () => {
        expect(buildFinalUrl(DIRTY, CLEANED, entries, new Set())).toBe(CLEANED);
    });

    it("returns the cleaned URL when the kept keys match no entry", () => {
        expect(buildFinalUrl(DIRTY, CLEANED, entries, new Set(["unknown"]))).toBe(CLEANED);
    });

    it("restores a kept query parameter at its original position", () => {
        const finalUrl = buildFinalUrl(DIRTY, CLEANED, entries, new Set(["utm_source"]));

        expect(finalUrl).toBe("https://example.com/page?id=5&utm_source=news&lang=en");
    });

    it("restores several kept parameters in the original order", () => {
        const finalUrl = buildFinalUrl(DIRTY, CLEANED, entries, new Set(["utm_medium", "utm_source"]));

        expect(finalUrl).toBe("https://example.com/page?id=5&utm_source=news&utm_medium=email&lang=en");
    });

    it("preserves the hash of the cleaned URL", () => {
        const finalUrl = buildFinalUrl(`${DIRTY}#top`, `${CLEANED}#top`, entries, new Set(["utm_source"]));

        expect(finalUrl).toBe("https://example.com/page?id=5&utm_source=news&lang=en#top");
    });

    it("restores a kept path tracker in its original place", () => {
        const dirty = "https://amazon.com/dp/B001/ref=nav_logo/details?tag=x";
        const cleaned = "https://amazon.com/dp/B001/details?tag=x";
        const pathEntries = [createEntry({key: "ref", value: "nav_logo", location: "path"})];

        const finalUrl = buildFinalUrl(dirty, cleaned, pathEntries, new Set(["ref"]));

        expect(finalUrl).toBe("https://amazon.com/dp/B001/ref=nav_logo/details?tag=x");
    });

    it("drops a removed path tracker and its value segment while keeping another", () => {
        const dirty = "https://example.com/a/track/xyz/keep/123/b";
        const cleaned = "https://example.com/a/b";
        const pathEntries = [
            createEntry({key: "track", value: "xyz", location: "path"}),
            createEntry({key: "keep", value: "123", location: "path"}),
        ];

        const finalUrl = buildFinalUrl(dirty, cleaned, pathEntries, new Set(["keep"]));

        expect(finalUrl).toBe("https://example.com/a/keep/123/b");
    });

    it("builds on the cleaned query when the redirect was unwrapped to another origin", () => {
        const dirty = "https://google.com/url?q=https%3A%2F%2Ftarget.com%2F%3Fid%3D1%26utm_source%3Dnews&utm_source=news";
        const cleaned = "https://target.com/?id=1";

        const finalUrl = buildFinalUrl(dirty, cleaned, entries.slice(0, 1), new Set(["utm_source"]));

        expect(finalUrl).toBe("https://target.com/?id=1&utm_source=news");
    });

    it("falls back to string assembly when the URLs cannot be parsed", () => {
        const pathEntry = createEntry({key: "ref", value: "abc", location: "path"});
        const queryEntry = createEntry({key: "tag", value: "x"});

        const finalUrl = buildFinalUrl("not a url", "/shop/", [pathEntry, queryEntry], new Set(["ref", "tag"]));

        expect(finalUrl).toBe("/shop/ref=abc?tag=x");
    });

    it("returns only the base in the string fallback when only path trackers are kept", () => {
        const pathEntry = createEntry({key: "ref", value: "abc", location: "path"});

        const finalUrl = buildFinalUrl("not a url", "/shop", [pathEntry], new Set(["ref"]));

        expect(finalUrl).toBe("/shop/ref=abc");
    });

    it("starts the query with ? in the string fallback when the cleaned URL had a query", () => {
        const queryEntry = createEntry({key: "tag", value: "x"});

        const finalUrl = buildFinalUrl("not a url", "/shop?id=1", [queryEntry], new Set(["tag"]));

        expect(finalUrl).toBe("/shop?id=1&tag=x");
    });

    it("keeps the hash after the query in the string fallback", () => {
        const queryEntry = createEntry({key: "tag", value: "x"});

        const finalUrl = buildFinalUrl("not a url", "/shop#top", [queryEntry], new Set(["tag"]));

        expect(finalUrl).toBe("/shop?tag=x#top");
    });
});
