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
import type { Page, ShortLink } from "../services/ShortLinksService";

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
});

describe("PUT /shortlinks", () => {
  it("updates the link identified by the body id", async () => {
    const link = await createLink("before");
    const response = await request("PUT", "/shortlinks", { id: link.id, key: "after", longUrl: LONG_URL, isActive: false });
    assert.equal(response.status, HTTP_OK);
    assert.equal((response.body as ShortLink).key, "after");
    assert.equal((response.body as ShortLink).isActive, false);
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
    const page = (await request("GET", "/shortlinks")).body as Page<ShortLink>;
    assert.deepEqual(page.content.map((link) => link.key), ["visible"]);
    assert.equal(page.page.size, DEFAULT_PAGE_SIZE);
  });

  it("includes archived links with showArchived=true and filters with search", async () => {
    await createLink("alpha");
    await createLink("beta", { isActive: false });
    const all = (await request("GET", "/shortlinks?showArchived=true")).body as Page<ShortLink>;
    const searched = (await request("GET", "/shortlinks?showArchived=true&search=BET")).body as Page<ShortLink>;
    assert.equal(all.page.totalElements, 2);
    assert.deepEqual(searched.content.map((link) => link.key), ["beta"]);
  });

  it("falls back to safe paging values for invalid params", async () => {
    const page = (await request("GET", "/shortlinks?page=-1&size=0")).body as Page<ShortLink>;
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
      assert.deepEqual(await request("POST", "/urlcleaner", body), { status: HTTP_BAD_REQUEST, body: { error } });
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
    });
  });

  it("falls back to the stored title when the page has none", async () => {
    await createLink("fallback", { title: "Local title" });
    stubExternalPage("<html></html>");
    const response = await requestJson(server, "GET", "/public/preview/fallback");
    assert.equal((response.body as { title: string }).title, "Local title");
  });

  it("answers a problem-detail 404 for an unknown or archived key", async () => {
    await createLink("archivedkey", { isActive: false });
    const expected = { status: HTTP_NOT_FOUND, body: { type: "about:blank", title: "Not Found", status: HTTP_NOT_FOUND } };
    assert.deepEqual(await requestJson(server, "GET", "/public/preview/archivedkey"), expected);
    assert.deepEqual(await requestJson(server, "GET", "/public/preview/nope-nope"), expected);
  });
});
