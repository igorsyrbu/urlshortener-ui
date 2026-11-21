import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it, mock } from "node:test";
import {
  createTestUserWithoutLinks,
  requestJson,
  startTestServer,
  type JsonResponse,
  type TestServer,
  type TestUser,
} from "../test-utils";
import type { ShortLink } from "../services/ShortLinksService";
import type { PagedModel } from "../services/page";
import { createProblem } from "../problem";

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE_ENTITY = 422;
const LONG_URL = "https://example.com/page";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const DEFAULT_PAGE_SIZE = 20;
const HTML_CONTENT_TYPE = "text/html";
let server: TestServer;
let user: TestUser;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

beforeEach(() => {
  user = createTestUserWithoutLinks();
});

afterEach(() => {
  mock.restoreAll();
});

function request(method: string, path: string, body?: unknown): Promise<JsonResponse> {
  return requestJson(server, method, path, { authorization: user.authorization, body });
}

async function createLink(key: string, extra: Record<string, unknown> = {}): Promise<ShortLink> {
  const response = await request("POST", "/shortlinks", { key, longUrl: LONG_URL, ...extra });
  assert.equal(response.status, HTTP_CREATED);
  return response.body as ShortLink;
}

function stubExternalPage(html: string): void {
  const realFetch = globalThis.fetch;
  mock.method(globalThis, "fetch", (input: string | URL | Request, init?: RequestInit) => {
    if (String(input).startsWith(server.baseUrl)) return realFetch(input, init);
    return Promise.resolve(new Response(html, { status: HTTP_OK, headers: { "content-type": HTML_CONTENT_TYPE } }));
  });
}

describe("POST /shortlinks", () => {
  it("creates a link and returns 201", async () => {
    const link = await createLink("created", { title: "Name" });
    assert.equal(link.key, "created");
    assert.equal(link.title, "Name");
    assert.equal(link.isActive, true);
  });

  it("answers 409 for a taken key", async () => {
    await createLink("taken");
    const response = await request("POST", "/shortlinks", { key: "taken", longUrl: LONG_URL });
    assert.equal(response.status, HTTP_CONFLICT);
  });

  it("answers 400 for an invalid key", async () => {
    const response = await request("POST", "/shortlinks", { key: "a", longUrl: LONG_URL });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });

  it("saves a trimmed description and leaves a blank one out of the answer", async () => {
    const described = await createLink("described", { description: "  Launch docs  " });
    const blank = await createLink("blank", { description: "   " });
    assert.equal(described.description, "Launch docs");
    assert.equal("description" in blank, false);
  });

  it("accepts a description of 1000 characters and answers 400 for a longer one", async () => {
    const atLimit = await request("POST", "/shortlinks", { key: "at-limit", longUrl: LONG_URL, description: "d".repeat(1000) });
    const tooLong = await request("POST", "/shortlinks", { key: "too-long", longUrl: LONG_URL, description: "d".repeat(1001) });
    assert.equal(atLimit.status, HTTP_CREATED);
    assert.equal(tooLong.status, HTTP_BAD_REQUEST);
  });
});

const INVALID_LONG_URLS: Array<[string, unknown]> = [
  ["a blank longUrl", ""],
  ["a longUrl that is not a URL", "not a url"],
  ["a non-http longUrl", "ftp://example.com/file"],
  ["a numeric longUrl", 5],
  ["a missing longUrl", undefined],
];

describe("long URL validation", () => {
  for (const [description, longUrl] of INVALID_LONG_URLS) {
    it(`answers the same 400 for ${description} on POST and PUT`, async () => {
      const link = await createLink("valid");
      const created = await request("POST", "/shortlinks", { key: "new-key", longUrl });
      const updated = await request("PUT", "/shortlinks", { id: link.id, key: "valid", longUrl });
      assert.equal(created.status, HTTP_BAD_REQUEST);
      assert.deepEqual(created, updated);
    });
  }
});

describe("malformed link bodies", () => {
  const malformedBodies: Array<[string, unknown]> = [
    ["an empty object", {}],
    ["an array", []],
    ["a numeric key", { key: 5, longUrl: LONG_URL }],
    ["a numeric title", { key: "numeric-title", longUrl: LONG_URL, title: 7 }],
  ];
  for (const [description, body] of malformedBodies) {
    it(`answers ${description} without taking the server down`, async () => {
      const response = await request("POST", "/shortlinks", body);
      const nextResponse = await request("GET", "/shortlinks");
      assert.ok(response.status < 500, `status ${response.status}`);
      assert.equal(nextResponse.status, HTTP_OK);
    });
  }

  it("ignores tag ids that are not a list of strings", async () => {
    const response = await request("POST", "/shortlinks", { key: "tagged", longUrl: LONG_URL, tagIds: "tag-1" });
    assert.equal(response.status, HTTP_CREATED);
  });
});

describe("PUT /shortlinks", () => {
  it("updates the link identified by the body id", async () => {
    const link = await createLink("before");
    const response = await request("PUT", "/shortlinks", { id: link.id, key: "after", longUrl: LONG_URL, isActive: false });
    assert.equal(response.status, HTTP_OK);
    assert.equal((response.body as ShortLink).key, "after");
    assert.equal((response.body as ShortLink).isActive, false);
  });

  it("suspends and resumes a link, and keeps the state when isSuspended is omitted", async () => {
    const created = await createLink("suspended");
    const suspended = await request("PUT", "/shortlinks", { id: created.id, key: "suspended", longUrl: LONG_URL, isSuspended: true });
    const kept = await request("PUT", "/shortlinks", { id: created.id, key: "suspended", longUrl: LONG_URL });
    const resumed = await request("PUT", "/shortlinks", { id: created.id, key: "suspended", longUrl: LONG_URL, isSuspended: false });
    assert.equal(created.isSuspended, false);
    assert.equal((suspended.body as ShortLink).isSuspended, true);
    assert.equal((kept.body as ShortLink).isSuspended, true);
    assert.equal((resumed.body as ShortLink).isSuspended, false);
  });

  it("removes the description when the update leaves it out", async () => {
    const link = await createLink("described-update", { description: "Launch docs" });
    const response = await request("PUT", "/shortlinks", { id: link.id, key: "described-update", longUrl: LONG_URL });
    assert.equal(response.status, HTTP_OK);
    assert.equal("description" in (response.body as ShortLink), false);
  });

  it("answers 400 without an id", async () => {
    const response = await request("PUT", "/shortlinks", { key: "any", longUrl: LONG_URL });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });

  it("answers 400 for a partial payload", async () => {
    const link = await createLink("partial");
    const response = await request("PUT", "/shortlinks", { id: link.id, isActive: false });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });

  it("answers 404 for an unknown id", async () => {
    const response = await request("PUT", "/shortlinks", { id: UNKNOWN_ID, key: "any", longUrl: LONG_URL });
    assert.equal(response.status, HTTP_NOT_FOUND);
  });
});

describe("GET /shortlinks", () => {
  it("paginates with the default size and hides archived links", async () => {
    await createLink("visible");
    await createLink("archived", { isActive: false });
    const page = (await request("GET", "/shortlinks")).body as PagedModel<ShortLink>;
    assert.deepEqual(page.content.map((link) => link.key), ["visible"]);
    assert.equal(page.page.size, DEFAULT_PAGE_SIZE);
  });

  it("includes archived links with showArchived=true and filters with search", async () => {
    await createLink("alpha");
    await createLink("beta", { isActive: false });
    const all = (await request("GET", "/shortlinks?showArchived=true")).body as PagedModel<ShortLink>;
    const searched = (await request("GET", "/shortlinks?showArchived=true&search=BET")).body as PagedModel<ShortLink>;
    assert.equal(all.page.totalElements, 2);
    assert.deepEqual(searched.content.map((link) => link.key), ["beta"]);
  });

  it("falls back to safe paging values for invalid params", async () => {
    const page = (await request("GET", "/shortlinks?page=-1&size=0")).body as PagedModel<ShortLink>;
    assert.equal(page.page.number, 0);
    assert.equal(page.page.size, DEFAULT_PAGE_SIZE);
  });

  it("returns only the requested links by ids", async () => {
    const wanted = await createLink("wanted");
    await createLink("noise");
    const response = await request("GET", `/shortlinks/byIds?ids=${wanted.id}, ${UNKNOWN_ID}`);
    assert.deepEqual((response.body as ShortLink[]).map((link) => link.key), ["wanted"]);
  });
});

describe("key endpoints", () => {
  it("returns a random key", async () => {
    const response = await request("GET", "/shortlinks/random");
    assert.match((response.body as { key: string }).key, /^[A-Za-z0-9]{6}$/);
  });

  it("answers 200 for an existing key and 404 otherwise", async () => {
    await createLink("exists");
    assert.deepEqual(await request("GET", "/shortlinks/EXISTS/exists"), { status: HTTP_OK, body: { exists: true } });
    assert.deepEqual(await request("GET", "/shortlinks/missing/exists"), { status: HTTP_NOT_FOUND, body: { exists: false } });
  });
});

describe("DELETE /shortlinks/:id", () => {
  it("deletes a link and then reports it missing", async () => {
    const link = await createLink("doomed");
    assert.equal((await request("DELETE", `/shortlinks/${link.id}`)).status, HTTP_OK);
    assert.equal((await request("DELETE", `/shortlinks/${link.id}`)).status, HTTP_NOT_FOUND);
  });
});

describe("POST /shortlinks/bulk/:action", () => {
  async function bulk(action: string, ids: unknown): Promise<JsonResponse> {
    return request("POST", `/shortlinks/bulk/${action}`, { ids });
  }

  async function storedLink(id: string): Promise<ShortLink | undefined> {
    const page = (await request("GET", "/shortlinks?showArchived=true")).body as PagedModel<ShortLink>;
    return page.content.find((link) => link.id === id);
  }

  it("archives, unarchives, suspends and resumes the caller's links", async () => {
    const link = await createLink("bulkflags");
    const steps: [string, Partial<ShortLink>][] = [
      ["archive", { isActive: false, isSuspended: false }],
      ["suspend", { isActive: false, isSuspended: true }],
      ["unarchive", { isActive: true, isSuspended: true }],
      ["resume", { isActive: true, isSuspended: false }],
    ];
    for (const [action, expected] of steps) {
      const response = await bulk(action, [link.id]);
      const stored = await storedLink(link.id);
      assert.deepEqual(response, { status: HTTP_OK, body: { processedIds: [link.id], notFoundIds: [] } });
      assert.deepEqual({ isActive: stored?.isActive, isSuspended: stored?.isSuspended }, expected);
    }
  });

  it("deletes the caller's links and reports unknown and foreign ids, without duplicates", async () => {
    const own = await createLink("bulkdelete");
    const foreignUser = createTestUserWithoutLinks();
    const foreign = (await requestJson(server, "POST", "/shortlinks", {
      authorization: foreignUser.authorization, body: { key: "foreignbulk", longUrl: LONG_URL },
    })).body as ShortLink;

    const response = await bulk("delete", [foreign.id, own.id, UNKNOWN_ID, own.id]);

    assert.deepEqual(response.body, { processedIds: [own.id], notFoundIds: [foreign.id, UNKNOWN_ID] });
    assert.equal(await storedLink(own.id), undefined);
    assert.equal((await requestJson(server, "GET", `/shortlinks/${foreign.id}`, { authorization: foreignUser.authorization })).status, HTTP_OK);
  });

  it("answers 400 for missing, empty, too many or malformed ids", async () => {
    const tooMany = Array.from({ length: DEFAULT_PAGE_SIZE + 1 }, () => UNKNOWN_ID);
    const statuses = await Promise.all(
      [undefined, [], tooMany, ["not-a-uuid"], [null]].map(async (ids) => (await bulk("archive", ids)).status),
    );
    assert.deepEqual(statuses, Array(statuses.length).fill(HTTP_BAD_REQUEST));
  });

  it("answers 404 for an unknown action", async () => {
    assert.equal((await bulk("publish", [UNKNOWN_ID])).status, HTTP_NOT_FOUND);
  });
});

describe("CSV endpoints", () => {
  it("exports links as csv", async () => {
    await createLink("exported");
    const response = await fetch(`${server.baseUrl}/shortlinks/export`, { headers: { Authorization: user.authorization } });
    assert.match(response.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(await response.text(), /sho\.rt\/exported/);
  });

  it("accepts an import and returns the queued job", async () => {
    const response = await fetch(`${server.baseUrl}/shortlinks/import?fileName=links.csv`, {
      method: "POST",
      headers: { Authorization: user.authorization, "Content-Type": "text/csv" },
      body: `Destination URL\n${LONG_URL}`,
    });
    const job = (await response.json()) as { status: string; fileName: string; totalRows: number };
    assert.equal(response.status, HTTP_OK);
    assert.deepEqual({ status: job.status, fileName: job.fileName, totalRows: job.totalRows }, { status: "QUEUED", fileName: "links.csv", totalRows: 1 });
  });

  it("rejects an import without a destination column with a detail message", async () => {
    const response = await fetch(`${server.baseUrl}/shortlinks/import`, {
      method: "POST",
      headers: { Authorization: user.authorization, "Content-Type": "text/csv" },
      body: "Title\nx",
    });
    assert.equal(response.status, HTTP_BAD_REQUEST);
    assert.ok(typeof ((await response.json()) as { detail: unknown }).detail === "string");
  });

  it("rejects a second import while one is running", async () => {
    const importCsv = () => fetch(`${server.baseUrl}/shortlinks/import`, {
      method: "POST",
      headers: { Authorization: user.authorization, "Content-Type": "text/csv" },
      body: `Destination URL\n${LONG_URL}`,
    });
    await importCsv();
    assert.equal((await importCsv()).status, HTTP_UNPROCESSABLE_ENTITY);
  });

  it("closes the progress stream immediately when no import is running", async () => {
    const response = await fetch(`${server.baseUrl}/shortlinks/import/updates`, { headers: { Authorization: user.authorization } });
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    assert.equal(await response.text(), "");
  });
});

describe("URL cleaner and metadata endpoints", () => {
  it("cleans tracking params", async () => {
    const response = await request("POST", "/urlcleaner", { url: "https://example.com/?utm_source=x&a=1" });
    assert.deepEqual(response.body, { url: "https://example.com/?a=1", removedParams: ["utm_source"], completeProviderSkipped: false });
  });

  const invalidCleanerBodies: Array<[string, unknown, string]> = [
    ["a missing url", {}, "URL is required"],
    ["a blank url", { url: "  " }, "URL is required"],
    ["a malformed url", { url: "not a url" }, "Invalid URL"],
  ];
  for (const [description, body, error] of invalidCleanerBodies) {
    it(`rejects ${description} for the cleaner`, async () => {
      assert.deepEqual(await request("POST", "/urlcleaner", body), { status: HTTP_BAD_REQUEST, body: createProblem(HTTP_BAD_REQUEST, error) });
    });
  }

  it("returns the page title, description and image of a long url", async () => {
    stubExternalPage('<title>Remote</title><meta name="description" content="Desc"><meta property="og:image" content="https://img/x.png">');
    const response = await request("GET", `/longurl/title?url=${encodeURIComponent(LONG_URL)}`);
    assert.deepEqual(response.body, { title: "Remote", description: "Desc", ogImageUrl: "https://img/x.png", faviconDomain: "example.com" });
  });

  it("answers 400 when the url param is missing", async () => {
    assert.equal((await request("GET", "/longurl/title")).status, HTTP_BAD_REQUEST);
  });

  it("returns an empty title for an unreachable page", async () => {
    const realFetch = globalThis.fetch;
    mock.method(globalThis, "fetch", (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).startsWith(server.baseUrl)) return realFetch(input, init);
      return Promise.reject(new TypeError("offline"));
    });
    const response = await request("GET", `/longurl/title?url=${encodeURIComponent(LONG_URL)}`);
    assert.deepEqual(response.body, { title: "", description: null, ogImageUrl: null, faviconDomain: "example.com" });
  });
});

describe("GET /public/preview/:key", () => {
  it("returns the preview of an active link without authentication", async () => {
    await createLink("previewme", { title: "Local title" });
    stubExternalPage("<title>Remote title</title>");
    const response = await requestJson(server, "GET", "/public/preview/previewme");
    assert.deepEqual(response.body, {
      key: "previewme",
      shortUrl: "https://sho.rt/previewme",
      longUrl: LONG_URL,
      title: "Remote title",
      description: null,
      ogImageUrl: null,
      faviconDomain: "example.com",
      isPasswordProtected: false,
    });
  });

  it("falls back to the stored title when the page has none", async () => {
    await createLink("fallback", { title: "Local title" });
    stubExternalPage("<html></html>");
    const response = await requestJson(server, "GET", "/public/preview/fallback");
    assert.equal((response.body as { title: string }).title, "Local title");
  });

  it("answers for a stored long URL that cannot be parsed, without fetching it", async () => {
    const link = await createLink("unparsable", { title: "Stored title" });
    user.state.links[0] = { ...user.state.links[0], longUrl: "::" };
    const fetchSpy = mock.method(globalThis, "fetch");
    const response = await requestJson(server, "GET", "/public/preview/unparsable");
    const externalCalls = fetchSpy.mock.calls.filter((call) => !String(call.arguments[0]).startsWith(server.baseUrl));
    assert.equal(response.status, HTTP_OK);
    assert.equal((response.body as { faviconDomain: unknown }).faviconDomain, null);
    assert.equal((response.body as { title: string }).title, link.title);
    assert.equal(externalCalls.length, 0);
  });

  it("previews an archived link", async () => {
    stubExternalPage("<html><head><title>Archived page</title></head></html>");
    await createLink("archivedkey", { isActive: false });
    const response = await requestJson(server, "GET", "/public/preview/archivedkey");
    assert.equal(response.status, HTTP_OK);
    assert.equal((response.body as { longUrl: string }).longUrl, LONG_URL);
  });

  it("answers a problem-detail 404 for an unknown or suspended key", async () => {
    await createLink("suspendedkey", { isSuspended: true });
    const suspended = await requestJson(server, "GET", "/public/preview/suspendedkey");
    const unknown = await requestJson(server, "GET", "/public/preview/nope-nope");
    assert.deepEqual(suspended, { status: HTTP_NOT_FOUND, body: createProblem(HTTP_NOT_FOUND, "No short link has the key 'suspendedkey'.") });
    assert.deepEqual(unknown, { status: HTTP_NOT_FOUND, body: createProblem(HTTP_NOT_FOUND, "No short link has the key 'nope-nope'.") });
  });
});
