import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanUrl } from "./UrlCleanerService";

interface CleanCase {
  name: string;
  input: string;
  expectedUrl: string;
  expectedRemoved: string[];
}

const CLEAN_CASES: CleanCase[] = [
  {
    name: "leaves a URL without query params untouched",
    input: "https://example.com/path",
    expectedUrl: "https://example.com/path",
    expectedRemoved: [],
  },
  {
    name: "removes utm parameters",
    input: "https://example.com/?utm_source=a&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e",
    expectedUrl: "https://example.com/",
    expectedRemoved: ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"],
  },
  {
    name: "removes click identifiers",
    input: "https://example.com/?fbclid=1&gclid=2&msclkid=3&ttclid=4&twclid=5&dclid=6",
    expectedUrl: "https://example.com/",
    expectedRemoved: ["fbclid", "gclid", "msclkid", "ttclid", "twclid", "dclid"],
  },
  {
    name: "removes mailing and referrer parameters",
    input: "https://example.com/?mc_cid=1&mc_eid=2&ref=3&referrer=4",
    expectedUrl: "https://example.com/",
    expectedRemoved: ["mc_cid", "mc_eid", "ref", "referrer"],
  },
  {
    name: "keeps functional parameters and their order",
    input: "https://example.com/?page=2&utm_source=a&sort=asc",
    expectedUrl: "https://example.com/?page=2&sort=asc",
    expectedRemoved: ["utm_source"],
  },
  {
    name: "reports a repeated tracker once and removes every occurrence",
    input: "https://example.com/?ref=a&x=1&ref=b",
    expectedUrl: "https://example.com/?x=1",
    expectedRemoved: ["ref"],
  },
  {
    name: "preserves the fragment",
    input: "https://example.com/?fbclid=1#section",
    expectedUrl: "https://example.com/#section",
    expectedRemoved: ["fbclid"],
  },
  {
    name: "treats parameter names as case sensitive",
    input: "https://example.com/?UTM_SOURCE=a",
    expectedUrl: "https://example.com/?UTM_SOURCE=a",
    expectedRemoved: [],
  },
  {
    name: "unwraps a /url redirect and cleans the inner URL",
    input: "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fa%3Futm_source%3Dx%26keep%3D1&sa=t",
    expectedUrl: "https://example.com/a?keep=1",
    expectedRemoved: ["utm_source"],
  },
  {
    name: "keeps the outer URL when the redirect target is not http(s)",
    input: "https://www.google.com/url?q=ftp%3A%2F%2Fexample.com&ref=1",
    expectedUrl: "https://www.google.com/url?q=ftp%3A%2F%2Fexample.com",
    expectedRemoved: ["ref"],
  },
  {
    name: "keeps the outer URL when the redirect target is not a URL",
    input: "https://www.google.com/url?q=not-a-url",
    expectedUrl: "https://www.google.com/url?q=not-a-url",
    expectedRemoved: [],
  },
];

describe("cleanUrl", () => {
  for (const { name, input, expectedUrl, expectedRemoved } of CLEAN_CASES) {
    it(name, () => {
      const result = cleanUrl(input);
      assert.equal(result.url, expectedUrl);
      assert.deepEqual(result.removedParams, expectedRemoved);
      assert.equal(result.completeProviderSkipped, false);
    });
  }

  it("throws for a value that is not a URL", () => {
    assert.throws(() => cleanUrl("not a url"), TypeError);
  });
});
