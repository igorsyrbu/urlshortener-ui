import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { createTestUser, createTestUserWithoutLinks, type TestUser } from "../test-utils";
import { ShortLinksService, type ShortLink, type ShortLinkMutationResult } from "./ShortLinksService";

const LONG_URL = "https://example.com/page";
const SHORT_DOMAIN = "https://sho.rt";
const DEFAULT_TITLE = "Untitled Link";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const SEEDED_WORK_TAG_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const KEY_MAX_LENGTH = 30;
const RANDOM_KEY_LENGTH = 6;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
let service: ShortLinksService;
let user: TestUser;

beforeEach(() => {
  service = new ShortLinksService();
  user = createTestUserWithoutLinks();
});

function createLink(key: string, overrides: Partial<Parameters<ShortLinksService["createLink"]>[1]> = {}): ShortLink {
  const result = service.createLink(user.uuid, { key, longUrl: LONG_URL, ...overrides });
  assert.ok(result.ok, `expected link "${key}" to be created`);
  return result.link;
}

function expectFailure(result: ShortLinkMutationResult, status: number): string {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unreachable");
  assert.equal(result.status, status);
  return result.error;
}

describe("ShortLinksService.createLink", () => {
  it("creates an active link with defaults and puts it first", () => {
    createLink("older");
    const link = createLink("newer", { longUrl: `  ${LONG_URL}  ` });
    assert.equal(link.title, DEFAULT_TITLE);
    assert.equal(link.isActive, true);
    assert.equal(link.shortUrl, `${SHORT_DOMAIN}/newer`);
    assert.equal(link.longUrl, LONG_URL);
    assert.deepEqual(service.getAllLinks(user.uuid).map((item) => item.key), ["newer", "older"]);
  });

  it("trims the key and title", () => {
    const link = createLink("  spaced  ", { title: "  Name  " });
    assert.equal(link.key, "spaced");
    assert.equal(link.title, "Name");
  });

  it("rejects an already used key regardless of case", () => {
    createLink("Taken");
    const error = expectFailure(service.createLink(user.uuid, { key: "tAKEN", longUrl: LONG_URL }), HTTP_CONFLICT);
    assert.equal(error, "This short link is already taken.");
  });

  it("allows the same key for different users", () => {
    createLink("shared");
    const other = createTestUserWithoutLinks();
    assert.equal(service.createLink(other.uuid, { key: "shared", longUrl: LONG_URL }).ok, true);
  });

  it("reports a reserved key as taken without revealing the reservation", () => {
    const error = expectFailure(service.createLink(user.uuid, { key: "Dashboard", longUrl: LONG_URL }), HTTP_CONFLICT);
    assert.equal(error, "Key 'Dashboard' is already taken.");
  });

  const invalidKeys: Array<[string, string]> = [
    ["blank", "   "],
    ["shorter than two characters", "a"],
    ["longer than the maximum", "a".repeat(KEY_MAX_LENGTH + 1)],
    ["containing forbidden characters", "bad key!"],
  ];
  for (const [description, key] of invalidKeys) {
    it(`rejects a key ${description}`, () => {
      expectFailure(service.createLink(user.uuid, { key, longUrl: LONG_URL }), HTTP_BAD_REQUEST);
    });
  }

  it("keeps only existing tags when associating", () => {
    const link = createLink("tagged", { tagIds: [SEEDED_WORK_TAG_ID, UNKNOWN_ID] });
    assert.deepEqual(link.tagIds, [SEEDED_WORK_TAG_ID]);
  });
});

describe("ShortLinksService.updateLink", () => {
  it("replaces key, url, title and active flag", () => {
    const link = createLink("before");
    const result = service.updateLink(user.uuid, link.id, { key: "after", longUrl: "https://example.org", title: "T", isActive: false });
    assert.ok(result.ok);
    assert.deepEqual(
      { key: result.link.key, shortUrl: result.link.shortUrl, longUrl: result.link.longUrl, title: result.link.title, isActive: result.link.isActive },
      { key: "after", shortUrl: `${SHORT_DOMAIN}/after`, longUrl: "https://example.org", title: "T", isActive: false },
    );
  });

  it("keeps title and active flag when they are omitted", () => {
    const link = createLink("keep", { title: "Original", isActive: false });
    const result = service.updateLink(user.uuid, link.id, { key: "keep", longUrl: LONG_URL });
    assert.ok(result.ok);
    assert.equal(result.link.title, "Original");
    assert.equal(result.link.isActive, false);
  });

  it("accepts re-casing the own key", () => {
    const link = createLink("casing");
    assert.equal(service.updateLink(user.uuid, link.id, { key: "CASING", longUrl: LONG_URL }).ok, true);
  });

  it("rejects the key of another link", () => {
    createLink("first");
    const second = createLink("second");
    expectFailure(service.updateLink(user.uuid, second.id, { key: "first", longUrl: LONG_URL }), HTTP_CONFLICT);
  });

  it("returns not found for an unknown id", () => {
    expectFailure(service.updateLink(user.uuid, UNKNOWN_ID, { key: "any", longUrl: LONG_URL }), HTTP_NOT_FOUND);
  });

  const invalidPayloads: Array<[string, { key: string; longUrl: string }]> = [
    ["a blank key", { key: " ", longUrl: LONG_URL }],
    ["a blank url", { key: "valid", longUrl: " " }],
    ["a non-http url", { key: "valid", longUrl: "ftp://example.com" }],
    ["a malformed url", { key: "valid", longUrl: "not a url" }],
  ];
  for (const [description, payload] of invalidPayloads) {
    it(`rejects ${description}`, () => {
      const link = createLink("target");
      expectFailure(service.updateLink(user.uuid, link.id, payload), HTTP_BAD_REQUEST);
    });
  }

  it("replaces the tag associations only when tagIds is provided", () => {
    const link = createLink("labelled", { tagIds: [SEEDED_WORK_TAG_ID] });
    const untouched = service.updateLink(user.uuid, link.id, { key: "labelled", longUrl: LONG_URL });
    assert.ok(untouched.ok);
    assert.deepEqual(untouched.link.tagIds, [SEEDED_WORK_TAG_ID]);
    const cleared = service.updateLink(user.uuid, link.id, { key: "labelled", longUrl: LONG_URL, tagIds: [] });
    assert.ok(cleared.ok);
    assert.deepEqual(cleared.link.tagIds, []);
  });
});

describe("ShortLinksService listing", () => {
  it("paginates active links and hides archived ones by default", () => {
    createLink("one");
    createLink("two");
    createLink("three", { isActive: false });
    const page = service.getPaginatedLinks(user.uuid, 0, 1);
    assert.deepEqual(page.page, { size: 1, number: 0, totalElements: 2, totalPages: 2 });
    assert.deepEqual(page.content.map((link) => link.key), ["two"]);
  });

  it("includes archived links when requested", () => {
    createLink("active");
    createLink("archived", { isActive: false });
    assert.equal(service.getPaginatedLinks(user.uuid, 0, 10, true).page.totalElements, 2);
  });

  it("returns an empty page beyond the last one", () => {
    createLink("only");
    assert.deepEqual(service.getPaginatedLinks(user.uuid, 5, 10).content, []);
  });

  const searchTerms: Array<[string, string]> = [
    ["title", "GUIDE"],
    ["key", "UNIQUEKEY"],
    ["destination url", "deep-path"],
  ];
  for (const [field, term] of searchTerms) {
    it(`searches by ${field} case-insensitively`, () => {
      createLink("uniquekey", { title: "A guide", longUrl: "https://example.com/deep-path" });
      createLink("other", { title: "Unrelated", longUrl: "https://example.com/else" });
      assert.deepEqual(service.getPaginatedLinks(user.uuid, 0, 10, false, term).content.map((link) => link.key), ["uniquekey"]);
    });
  }

  it("finds links by exact ids and ignores unknown ones", () => {
    const link = createLink("byid");
    createLink("noise");
    assert.deepEqual(service.getLinksByIds(user.uuid, [link.id, UNKNOWN_ID]).map((item) => item.key), ["byid"]);
  });
});

describe("ShortLinksService keys", () => {
  it("reports whether a key exists case-insensitively", () => {
    createLink("Exists");
    assert.equal(service.keyExists(user.uuid, "exists"), true);
    assert.equal(service.keyExists(user.uuid, "missing"), false);
  });

  it("generates an alphanumeric key of fixed length that is not taken", () => {
    const key = service.generateRandomKey();
    assert.match(key, new RegExp(`^[A-Za-z0-9]{${RANDOM_KEY_LENGTH}}$`));
    assert.equal(service.keyExists(user.uuid, key), false);
  });

  it("finds an active link by key across users, ignoring case", () => {
    const link = createLink("lookup");
    assert.equal(service.findByShortKey("LOOKUP")?.id, link.id);
  });

  it("does not find archived links by key", () => {
    createLink("hidden", { isActive: false });
    assert.equal(service.findByShortKey("hidden"), null);
  });
});

describe("ShortLinksService.deleteLink", () => {
  it("removes the link and its tag associations", () => {
    const link = createLink("gone", { tagIds: [SEEDED_WORK_TAG_ID] });
    assert.equal(service.deleteLink(user.uuid, link.id), true);
    assert.equal(service.getAllLinks(user.uuid).length, 0);
    assert.equal(user.state.tagAssociations.has(link.id), false);
  });

  it("returns false for an unknown id", () => {
    assert.equal(service.deleteLink(user.uuid, UNKNOWN_ID), false);
  });

  it("does not touch the links of other users", () => {
    const other = createTestUser();
    const otherCount = other.state.links.length;
    const link = createLink("mine");
    service.deleteLink(user.uuid, link.id);
    assert.equal(other.state.links.length, otherCount);
  });
});

describe("ShortLinksService CSV export", () => {
  it("writes a header and one quoted row per link", () => {
    createLink("exported", { title: 'Say "hi"', tagIds: [SEEDED_WORK_TAG_ID] });
    const [header, row] = service.exportLinksCsv(user.uuid).split("\n");
    assert.equal(header, '"Short link","Destination URL","Title","Clicks","Created at","Updated at","Tags","Archive"');
    assert.ok(row.startsWith(`"${SHORT_DOMAIN}/exported","${LONG_URL}","Say ""hi""","0",`));
    assert.ok(row.endsWith('"Work","false"'));
  });

  it("prefixes cells that start with formula characters", () => {
    createLink("formula", { title: "=SUM(A1)" });
    assert.ok(service.exportLinksCsv(user.uuid).includes(`"'=SUM(A1)"`));
  });

  it("honors the archived and search filters", () => {
    createLink("kept");
    createLink("archived", { isActive: false });
    assert.equal(service.exportLinksCsv(user.uuid).split("\n").length, 2);
    assert.equal(service.exportLinksCsv(user.uuid, true).split("\n").length, 3);
    assert.equal(service.exportLinksCsv(user.uuid, true, "archived").split("\n").length, 2);
  });
});

describe("ShortLinksService CSV import", () => {
  const HEADER = "Short link,Destination URL,Title,Tags";

  it("imports valid rows with custom keys, titles and tags", () => {
    const result = service.importLinksCsv(user.uuid, `${HEADER}\nsho.rt/custom,${LONG_URL},Title,"Work,Brand new"`);
    assert.deepEqual(result, { ok: true, imported: 1, failed: [] });
    const [link] = service.getAllLinks(user.uuid);
    assert.equal(link.key, "custom");
    assert.equal(link.title, "Title");
    assert.equal(link.tagIds?.length, 2);
  });

  it("generates a key and default title when they are empty", () => {
    service.importLinksCsv(user.uuid, `${HEADER}\n,${LONG_URL},,`);
    const [link] = service.getAllLinks(user.uuid);
    assert.match(link.key, new RegExp(`^[A-Za-z0-9]{${RANDOM_KEY_LENGTH}}$`));
    assert.equal(link.title, DEFAULT_TITLE);
  });

  it("reports failing rows without aborting the file", () => {
    const result = service.importLinksCsv(user.uuid, `${HEADER}\n,not-a-url,,\n,${LONG_URL},,`);
    assert.ok(result.ok);
    assert.equal(result.imported, 1);
    assert.deepEqual(result.failed, [{ shortLink: null, destinationUrl: "not-a-url", reason: "Destination URL is invalid." }]);
  });

  it("fails a row whose key is reserved with the generic taken message", () => {
    const result = service.importLinksCsv(user.uuid, `${HEADER}\nlogin,${LONG_URL},,`);
    assert.ok(result.ok);
    assert.equal(result.failed[0].reason, "Key is already taken.");
  });

  it("replaces a taken key when generateTakenKeys is set", () => {
    createLink("dupe");
    const result = service.importLinksCsv(user.uuid, `${HEADER}\ndupe,${LONG_URL},,`, true);
    assert.ok(result.ok);
    assert.equal(result.imported, 1);
    assert.equal(service.getAllLinks(user.uuid).filter((link) => link.key === "dupe").length, 1);
  });

  const fileErrors: Array<[string, string, string]> = [
    ["an empty file", "", "Empty file: a header row is required."],
    ["a missing destination column", "Title\nx", "'Destination URL' column is required."],
    ["a header without rows", HEADER, "No data rows found."],
  ];
  for (const [description, csv, expectedError] of fileErrors) {
    it(`rejects ${description}`, () => {
      assert.deepEqual(service.importLinksCsv(user.uuid, csv), { ok: false, error: expectedError });
    });
  }

  it("rejects files with more than the maximum number of rows", () => {
    const rows = Array.from({ length: 1001 }, (_, index) => `,https://example.com/${index},,`).join("\n");
    const result = service.importLinksCsv(user.uuid, `${HEADER}\n${rows}`);
    assert.equal(result.ok, false);
  });

  it("parses quoted fields with embedded commas and escaped quotes", () => {
    service.importLinksCsv(user.uuid, `${HEADER}\n,${LONG_URL},"A, ""quoted"" title",`);
    assert.equal(service.getAllLinks(user.uuid)[0].title, 'A, "quoted" title');
  });

  it("skips blank rows silently", () => {
    const result = service.importLinksCsv(user.uuid, `${HEADER}\n,,,\n,${LONG_URL},,`);
    assert.deepEqual(result, { ok: true, imported: 1, failed: [] });
  });
});
