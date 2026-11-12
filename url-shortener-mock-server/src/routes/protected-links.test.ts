import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { createApp } from "../app";
import { createProblem } from "../problem";
import type { ShortLinkDto } from "../services/ShortLinksService";
import type { PagedModel } from "../services/page";
import { UNLOCK_FAILURE_WINDOW_MS, UNLOCK_MAX_FAILURES, UnlockAttemptLimiter } from "../services/UnlockAttemptLimiter";
import {
  createTestUser,
  createTestUserWithoutLinks,
  requestJson,
  startTestServer,
  TEST_CONFIG,
  type JsonResponse,
  type TestServer,
  type TestUser,
} from "../test-utils";

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_TOO_MANY_REQUESTS = 429;
const LONG_URL = "https://example.com/page";
const PASSWORD = "open-sesame";
const WRONG_PASSWORD = "not-the-password";
const PASSWORD_LENGTH_DETAIL = "password must be between 5 and 50 characters";
const NO_STORE = "no-store";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const FIXTURE_KEY = "Secret1";
const FIXTURE_PASSWORD = "secret-pass";

interface UnlockResponse extends JsonResponse {
  cacheControl: string | null;
}

let server: TestServer;
let user: TestUser;
let currentTimeMs = 0;

before(async () => {
  const unlockAttemptLimiter = new UnlockAttemptLimiter(() => currentTimeMs);
  server = await startTestServer(createApp({ config: TEST_CONFIG, unlockAttemptLimiter }));
});

after(async () => {
  await server.close();
});

beforeEach(() => {
  user = createTestUserWithoutLinks();
});

function request(method: string, path: string, body?: unknown): Promise<JsonResponse> {
  return requestJson(server, method, path, { authorization: user.authorization, body });
}

async function createLink(key: string, extra: Record<string, unknown> = {}): Promise<ShortLinkDto> {
  const response = await request("POST", "/shortlinks", { key, longUrl: LONG_URL, ...extra });
  assert.equal(response.status, HTTP_CREATED);
  return response.body as ShortLinkDto;
}

async function unlock(key: string, password: string, queryString = ""): Promise<UnlockResponse> {
  const response = await fetch(`${server.baseUrl}/public/shortlinks/${key}/unlock${queryString}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password }).toString(),
  });
  return { status: response.status, body: await response.json(), cacheControl: response.headers.get("cache-control") };
}

describe("password on POST and PUT /shortlinks", () => {
  it("reports protection without returning the password on create, list and byIds", async () => {
    const created = await createLink("guarded", { password: PASSWORD });
    const list = await request("GET", "/shortlinks");
    const byIds = await request("GET", `/shortlinks/byIds?ids=${created.id}`);
    const listed = (list.body as PagedModel<ShortLinkDto>).content[0];
    const found = (byIds.body as ShortLinkDto[])[0];

    for (const link of [created, listed, found]) {
      assert.equal(link.isPasswordProtected, true);
      assert.equal("password" in link, false);
    }
  });

  it("marks a link created without a password as unprotected", async () => {
    const created = await createLink("open");
    assert.equal(created.isPasswordProtected, false);
  });

  for (const [label, password] of [["shorter than 5", "abcd"], ["longer than 50", "x".repeat(51)], ["not a string", 12345]] as const) {
    it(`rejects a password that is ${label} on create and on update`, async () => {
      const link = await createLink("validated");
      const created = await request("POST", "/shortlinks", { key: "other", longUrl: LONG_URL, password });
      const updated = await request("PUT", "/shortlinks", { id: link.id, key: link.key, longUrl: LONG_URL, password });
      const expected = { status: HTTP_BAD_REQUEST, body: createProblem(HTTP_BAD_REQUEST, PASSWORD_LENGTH_DETAIL) };

      assert.deepEqual(created, expected);
      assert.deepEqual(updated, expected);
    });
  }

  it("accepts the shortest and the longest password, untrimmed", async () => {
    const shortest = await createLink("shortest", { password: " abc " });
    const longest = await createLink("longest", { password: "x".repeat(50) });
    const stored = await request("GET", `/shortlinks/${shortest.id}`);

    assert.equal(longest.isPasswordProtected, true);
    assert.equal((stored.body as ShortLinkDto).password, " abc ");
  });

  it("keeps the protection when an update sends the password again", async () => {
    const link = await createLink("kept", { password: PASSWORD });
    const updated = await request("PUT", "/shortlinks", { id: link.id, key: link.key, longUrl: LONG_URL, isActive: false, password: PASSWORD });

    assert.equal((updated.body as ShortLinkDto).isPasswordProtected, true);
    assert.equal("password" in (updated.body as object), false);
  });

  for (const [label, body] of [["without a password", {}], ["with a null password", { password: null }]] as const) {
    it(`removes the protection on an update ${label}`, async () => {
      const link = await createLink("removed", { password: PASSWORD });
      const updated = await request("PUT", "/shortlinks", { id: link.id, key: link.key, longUrl: LONG_URL, ...body });
      const stored = await request("GET", `/shortlinks/${link.id}`);

      assert.equal((updated.body as ShortLinkDto).isPasswordProtected, false);
      assert.equal("password" in (stored.body as object), false);
    });
  }

  it("leaves the password out of the CSV export", async () => {
    await createLink("exported", { password: PASSWORD });
    const exported = await request("GET", "/shortlinks/export");
    assert.equal(String(exported.body).includes(PASSWORD), false);
  });

  it("treats the reserved unlock key as taken", async () => {
    const response = await request("POST", "/shortlinks", { key: "unlock", longUrl: LONG_URL });
    assert.equal(response.status, 409);
  });
});

describe("GET /shortlinks/:id", () => {
  it("returns the owner's link with its password and forbids caching", async () => {
    const link = await createLink("mine", { password: PASSWORD });
    const response = await fetch(`${server.baseUrl}/shortlinks/${link.id}`, { headers: { Authorization: user.authorization } });
    const body = (await response.json()) as ShortLinkDto;

    assert.equal(response.status, HTTP_OK);
    assert.equal(response.headers.get("cache-control"), NO_STORE);
    assert.deepEqual(
      { id: body.id, key: body.key, password: body.password, isPasswordProtected: body.isPasswordProtected, tagIds: body.tagIds },
      { id: link.id, key: "mine", password: PASSWORD, isPasswordProtected: true, tagIds: [] },
    );
  });

  it("returns an unprotected link without a password field", async () => {
    const link = await createLink("plain");
    const response = await request("GET", `/shortlinks/${link.id}`);
    assert.equal((response.body as ShortLinkDto).isPasswordProtected, false);
    assert.equal("password" in (response.body as object), false);
  });

  it("answers 404 for an unknown id and for another user's link", async () => {
    const link = await createLink("theirs", { password: PASSWORD });
    const otherUser = createTestUserWithoutLinks();
    const unknown = await request("GET", `/shortlinks/${UNKNOWN_ID}`);
    const foreign = await requestJson(server, "GET", `/shortlinks/${link.id}`, { authorization: otherUser.authorization });
    const expected = { status: HTTP_NOT_FOUND, body: createProblem(HTTP_NOT_FOUND, "Link not found") };

    assert.deepEqual(unknown, expected);
    assert.deepEqual(foreign, expected);
  });

  it("requires authentication", async () => {
    const response = await requestJson(server, "GET", `/shortlinks/${UNKNOWN_ID}`);
    assert.equal(response.status, HTTP_UNAUTHORIZED);
  });

  it("does not shadow the random-key, byIds and export routes", async () => {
    const random = await request("GET", "/shortlinks/random");
    const byIds = await request("GET", "/shortlinks/byIds?ids=");
    const exported = await request("GET", "/shortlinks/export");

    assert.equal(typeof (random.body as { key: unknown }).key, "string");
    assert.deepEqual(byIds.body, []);
    assert.equal(exported.status, HTTP_OK);
  });
});

describe("POST /public/shortlinks/:key/unlock", () => {
  it("returns the destination for the right password, whatever the key's case, and forbids caching", async () => {
    await createLink("Unlockable", { password: PASSWORD });
    const response = await unlock("unlockABLE", PASSWORD);

    assert.deepEqual(response, { status: HTTP_OK, body: { longUrl: LONG_URL }, cacheControl: NO_STORE });
  });

  // Public lookups search every sandbox, so each case needs its own key.
  for (const [key, longUrl, expected] of [
    ["plainquery", "https://example.com/page", "https://example.com/page?utm_source=x&a=1"],
    ["ownquery", "https://example.com/page?own=1", "https://example.com/page?own=1&utm_source=x&a=1"],
    ["fragmentquery", "https://example.com/page#section", "https://example.com/page?utm_source=x&a=1#section"],
  ] as const) {
    it(`appends the visitor's query string to ${longUrl}`, async () => {
      await createLink(key, { password: PASSWORD, longUrl });
      const response = await unlock(key, PASSWORD, "?utm_source=x&a=1");
      assert.deepEqual(response.body, { longUrl: expected });
    });
  }

  it("answers 401 for a wrong password", async () => {
    await createLink("wrongpass", { password: PASSWORD });
    const response = await unlock("wrongpass", WRONG_PASSWORD);
    assert.deepEqual(
      { status: response.status, body: response.body },
      { status: HTTP_UNAUTHORIZED, body: createProblem(HTTP_UNAUTHORIZED, "Incorrect password.") },
    );
  });

  it("answers 400 for a blank password", async () => {
    await createLink("blankpass", { password: PASSWORD });
    const response = await unlock("blankpass", "   ");
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });

  it("answers 404 for an unknown, an archived and an unprotected link", async () => {
    await createLink("archivedlock", { password: PASSWORD, isActive: false });
    await createLink("unprotected");
    const statuses = await Promise.all(
      ["no-such-key", "archivedlock", "unprotected"].map(async (key) => (await unlock(key, PASSWORD)).status),
    );
    assert.deepEqual(statuses, [HTTP_NOT_FOUND, HTTP_NOT_FOUND, HTTP_NOT_FOUND]);
  });

  it("locks the link after five wrong passwords, even for the right one, until the window ends", async () => {
    await createLink("lockedout", { password: PASSWORD });
    for (let failure = 0; failure < UNLOCK_MAX_FAILURES; failure++) {
      assert.equal((await unlock("lockedout", WRONG_PASSWORD)).status, HTTP_UNAUTHORIZED);
    }

    const locked = await unlock("lockedout", PASSWORD);
    currentTimeMs += UNLOCK_FAILURE_WINDOW_MS;
    const afterWindow = await unlock("lockedout", PASSWORD);

    assert.deepEqual(
      { status: locked.status, body: locked.body },
      { status: HTTP_TOO_MANY_REQUESTS, body: createProblem(HTTP_TOO_MANY_REQUESTS, "Too many failed attempts. Try again later.") },
    );
    assert.equal(afterWindow.status, HTTP_OK);
  });

  it("does not count right passwords towards the lockout", async () => {
    await createLink("generous", { password: PASSWORD });
    for (let attempt = 0; attempt <= UNLOCK_MAX_FAILURES; attempt++) {
      assert.equal((await unlock("generous", PASSWORD)).status, HTTP_OK);
    }
  });

  it("unlocks the seeded protected link", async () => {
    createTestUser();
    const response = await unlock(FIXTURE_KEY, FIXTURE_PASSWORD);
    assert.equal(response.status, HTTP_OK);
  });
});

describe("protected links on public endpoints", () => {
  it("previews only the key, the short URL and the protection flag", async () => {
    await createLink("hidden", { password: PASSWORD, title: "Secret title" });
    const response = await requestJson(server, "GET", "/public/preview/hidden");

    assert.deepEqual(response, {
      status: HTTP_OK,
      body: { key: "hidden", shortUrl: "https://sho.rt/hidden", isPasswordProtected: true },
    });
  });

  it("leaves the destination out of an abuse report for a protected link", async () => {
    await createLink("reportedsecret", { password: PASSWORD });
    await createLink("reportedopen");
    const report = (shortUrl: string): Promise<JsonResponse> =>
      requestJson(server, "POST", "/public/abuse/report", { body: { shortUrl, reason: "OTHER" } });
    const protectedReport = await report("https://sho.rt/reportedsecret");
    const openReport = await report("https://sho.rt/reportedopen");

    assert.equal(protectedReport.status, HTTP_CREATED);
    assert.equal("longUrl" in (protectedReport.body as object), false);
    assert.equal((openReport.body as { longUrl: string }).longUrl, LONG_URL);
  });
});
