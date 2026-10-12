import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createTestUser, createUnregisteredAuthorization, requestJson, startTestServer, type TestServer } from "../test-utils";

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const CSV_LIMIT_BYTES = 100 * 1024;
let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

const PROTECTED_ENDPOINTS: Array<[string, string]> = [
  ["GET", "/users/me"],
  ["PUT", "/users/me/name"],
  ["GET", "/users/me/preferences"],
  ["PUT", "/users/me/preferences"],
  ["GET", "/users/sessions"],
  ["DELETE", "/users/sessions/current"],
  ["DELETE", "/users/sessions/other"],
  ["DELETE", "/users/sessions/some-id"],
  ["GET", "/shortlinks"],
  ["GET", "/shortlinks/random"],
  ["GET", "/shortlinks/export"],
  ["POST", "/shortlinks/import"],
  ["GET", "/shortlinks/import/updates"],
  ["GET", "/shortlinks/byIds"],
  ["GET", "/shortlinks/key/exists"],
  ["POST", "/shortlinks"],
  ["PUT", "/shortlinks"],
  ["DELETE", "/shortlinks/some-id"],
  ["GET", "/longurl/title"],
  ["POST", "/urlcleaner"],
  ["GET", "/tags"],
  ["POST", "/tags"],
  ["PUT", "/tags"],
  ["DELETE", "/tags/some-id"],
  ["GET", "/analytics"],
];

describe("protected endpoints", () => {
  for (const [method, path] of PROTECTED_ENDPOINTS) {
    it(`${method} ${path} rejects a request without credentials`, async () => {
      assert.equal((await requestJson(server, method, path)).status, HTTP_UNAUTHORIZED);
    });
  }

  it("rejects a valid token of a user who never logged in", async () => {
    const response = await requestJson(server, "GET", "/users/me", { authorization: createUnregisteredAuthorization() });
    assert.deepEqual(response.body, { error: "Unauthorized", message: "User not logged in." });
  });

  it("accepts the token of a logged-in user", async () => {
    const response = await requestJson(server, "GET", "/users/me", { authorization: createTestUser().authorization });
    assert.equal(response.status, HTTP_OK);
  });
});

describe("public endpoints", () => {
  it("do not require credentials for the abuse report endpoint", async () => {
    const response = await requestJson(server, "POST", "/public/abuse/report", { body: {} });
    assert.notEqual(response.status, HTTP_UNAUTHORIZED);
  });
});

describe("error simulation", () => {
  it("fails a protected request with a simulated 500 before authentication", async () => {
    const response = await requestJson(server, "GET", "/users/me", { headers: { "x-mock-error": "true" } });
    assert.equal(response.status, HTTP_INTERNAL_SERVER_ERROR);
  });

  it("also fails public endpoints", async () => {
    const response = await requestJson(server, "POST", "/ott/generate", { body: { username: "a@b.c" }, headers: { "x-mock-error": "true" } });
    assert.equal(response.status, HTTP_INTERNAL_SERVER_ERROR);
  });
});

describe("request body handling", () => {
  it("answers an oversized CSV body with a JSON 413 detail", async () => {
    const user = createTestUser();
    const response = await fetch(`${server.baseUrl}/shortlinks/import`, {
      method: "POST",
      headers: { Authorization: user.authorization, "Content-Type": "text/csv" },
      body: "x".repeat(CSV_LIMIT_BYTES + 1),
    });
    assert.equal(response.status, HTTP_PAYLOAD_TOO_LARGE);
    assert.deepEqual(await response.json(), { detail: "request entity too large" });
  });

  it("answers malformed JSON with a JSON 400 detail", async () => {
    const user = createTestUser();
    const response = await fetch(`${server.baseUrl}/tags`, {
      method: "POST",
      headers: { Authorization: user.authorization, "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(response.status, HTTP_BAD_REQUEST);
    assert.ok(typeof ((await response.json()) as { detail: unknown }).detail === "string");
  });
});
