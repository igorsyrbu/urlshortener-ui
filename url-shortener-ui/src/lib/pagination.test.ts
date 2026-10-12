import {describe, expect, it} from "vitest";
import {ROUTES} from "@/lib/constants";
import {buildLinksPageUrl, formatLinksRangeLabel, getPaginationRange, parseLinksPageParam} from "@/lib/pagination";

const PAGE_SIZE = 10;

describe("getPaginationRange", () => {
    it.each([
        ["the first full page", 0, 95, {start: 1, end: 10}],
        ["a middle page", 4, 95, {start: 41, end: 50}],
        ["a partial last page", 9, 95, {start: 91, end: 95}],
        ["an exactly full last page", 9, 100, {start: 91, end: 100}],
        ["a single element", 0, 1, {start: 1, end: 1}],
        ["fewer elements than the page size", 0, 3, {start: 1, end: 3}],
    ])("computes %s", (_name, page, total, expected) => {
        expect(getPaginationRange(page, PAGE_SIZE, total)).toEqual(expected);
    });

    it.each([0, -5])("returns an empty range for %i elements", (total) => {
        expect(getPaginationRange(0, PAGE_SIZE, total)).toEqual({start: 0, end: 0});
    });

    it("treats a negative page as the first page", () => {
        expect(getPaginationRange(-3, PAGE_SIZE, 95)).toEqual({start: 1, end: 10});
    });
});

describe("formatLinksRangeLabel", () => {
    it("labels a single link in singular form", () => {
        expect(formatLinksRangeLabel(1, 1, 1)).toBe("1 of 1 link");
    });

    it.each([
        [1, 10, 95, "1-10 of 95 links"],
        [91, 95, 95, "91-95 of 95 links"],
        [1, 2, 2, "1-2 of 2 links"],
        [0, 0, 0, "0-0 of 0 links"],
    ])("labels %i-%i of %i", (start, end, total, expected) => {
        expect(formatLinksRangeLabel(start, end, total)).toBe(expected);
    });
});

describe("parseLinksPageParam", () => {
    it.each([
        ["1", 0],
        ["2", 1],
        ["42", 41],
    ])("converts the one-based page %j to zero-based index %i", (value, expected) => {
        expect(parseLinksPageParam(value)).toBe(expected);
    });

    it.each([null, "", "0", "-1", "abc", "NaN"])("falls back to the first page for %j", (value) => {
        expect(parseLinksPageParam(value)).toBe(0);
    });
});

describe("buildLinksPageUrl", () => {
    it.each([0, -1])("omits the query for page index %i", (page) => {
        expect(buildLinksPageUrl(page)).toBe(ROUTES.LINKS);
    });

    it.each([
        [1, `${ROUTES.LINKS}?page=2`],
        [9, `${ROUTES.LINKS}?page=10`],
    ])("uses the one-based page number for index %i", (page, expected) => {
        expect(buildLinksPageUrl(page)).toBe(expected);
    });

    it("round-trips with parseLinksPageParam", () => {
        const pageParam = new URL(buildLinksPageUrl(6), "https://example.com").searchParams.get("page");

        expect(parseLinksPageParam(pageParam)).toBe(6);
    });
});
