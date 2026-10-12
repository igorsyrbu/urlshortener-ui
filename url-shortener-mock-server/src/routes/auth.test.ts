import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { requestJson, startTestServer, type JsonResponse, type TestServer } from "../test-utils";

const HTTP_OK = 200;
const HTTP_FOUND = 302;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;
const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const AUTH_CODE_PATTERN = new RegExp(`/auth/exchange\\?code=mock-auth-code-(${UUID_PATTERN})$`);
const REFRESH_COOKIE_NAME = "refresh_token";
let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

function createUniqueEmail(): string {
  return `${randomUUID()}@example.com`;
}

async function loginWithToken(): Promise<string> {
  const response = await fetch(`${server.baseUrl}/ott/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginType: "token", token: "t", email: createUniqueEmail() }),
    redirect: "manual",
  });
  const location = response.headers.get("location") ?? "";
  const match = AUTH_CODE_PATTERN.exec(location);
  assert.ok(match, `unexpected redirect location: ${location}`);
  return `mock-auth-code-${match[1]}`;
}

async function exchangeCode(code: string): Promise<Response> {
  return fetch(`${server.baseUrl}/auth/code/exchange?code=${code}`);
}

function readRefreshCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${REFRESH_COOKIE_NAME}=([^;]+)`).exec(setCookie);
  assert.ok(match, `missing refresh cookie in: ${setCookie}`);
  return `${REFRESH_COOKIE_NAME}=${match[1]}`;
}

describe("POST /ott/generate", () => {
  it("sends a magic link for a new username", async () => {
    const response = await requestJson(server, "POST", "/ott/generate", { body: { username: createUniqueEmail() } });
    assert.deepEqual(response, { status: HTTP_OK, body: { message: "Magic link sent" } });
  });

  it("rejects a request without username", async () => {
    const response = await requestJson(server, "POST", "/ott/generate", { body: {} });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });

  it("throttles a repeated request for the same username with Retry-After", async () => {
    const username = createUniqueEmail();
    await requestJson(server, "POST", "/ott/generate", { body: { username } });
    const throttled = await fetch(`${server.baseUrl}/ott/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    assert.equal(throttled.status, HTTP_TOO_MANY_REQUESTS);
    assert.ok(Number(throttled.headers.get("retry-after")) > 0);
  });

  it("does not throttle a different username", async () => {
    await requestJson(server, "POST", "/ott/generate", { body: { username: createUniqueEmail() } });
    const response = await requestJson(server, "POST", "/ott/generate", { body: { username: createUniqueEmail() } });
    assert.equal(response.status, HTTP_OK);
  });
});

describe("POST /ott/login", () => {
  const invalidBodies: Array<[string, Record<string, string>]> = [
    ["a token login without token", { loginType: "token", email: "a@b.c" }],
    ["a token login without email", { loginType: "token", token: "t" }],
    ["an otp login without code", { loginType: "otp", email: "a@b.c" }],
    ["an otp login without email", { loginType: "otp", code: "123456" }],
    ["an unknown login type", { loginType: "password" }],
    ["a missing login type", {}],
  ];
  for (const [description, body] of invalidBodies) {
    it(`rejects ${description}`, async () => {
      const response = await requestJson(server, "POST", "/ott/login", { body });
      assert.equal(response.status, HTTP_BAD_REQUEST);
    });
  }

  it("redirects a token login to the frontend exchange page with a mock code", async () => {
    assert.match(await loginWithToken(), /^mock-auth-code-/);
  });

  it("redirects an otp login to the frontend exchange page", async () => {
    const response = await fetch(`${server.baseUrl}/ott/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginType: "otp", email: createUniqueEmail(), code: "123456" }),
      redirect: "manual",
    });
    assert.equal(response.status, HTTP_FOUND);
    assert.match(response.headers.get("location") ?? "", AUTH_CODE_PATTERN);
  });
});

describe("GET /auth/code/exchange", () => {
  it("returns an access token that authenticates the user and sets a refresh cookie", async () => {
    const response = await exchangeCode(await loginWithToken());
    assert.equal(response.status, HTTP_OK);
    const { accessToken } = (await response.json()) as { accessToken: string };
    const profile = await requestJson(server, "GET", "/users/me", { authorization: `Bearer ${accessToken}` });
    assert.equal(profile.status, HTTP_OK);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /refresh_token=mock-refresh-token-/);
    assert.match(cookie, /HttpOnly/i);
  });

  it("accepts a google mock code", async () => {
    const response = await exchangeCode(`mock-google-code-${randomUUID()}`);
    assert.equal(response.status, HTTP_OK);
  });

  const invalidCodes = ["", "garbage", "mock-auth-code-not-a-uuid", `other-prefix-${randomUUID()}`];
  for (const code of invalidCodes) {
    it(`rejects the code "${code}" and clears the refresh cookie`, async () => {
      const response = await exchangeCode(code);
      assert.equal(response.status, HTTP_UNAUTHORIZED);
      assert.match(response.headers.get("set-cookie") ?? "", /refresh_token=;/);
    });
  }
});

describe("POST /token/refresh", () => {
  it("issues a new access token for a valid refresh cookie", async () => {
    const cookie = readRefreshCookie(await exchangeCode(await loginWithToken()));
    const response = await fetch(`${server.baseUrl}/token/refresh`, { method: "POST", headers: { Cookie: cookie } });
    const { accessToken } = (await response.json()) as { accessToken: string };
    const profile = await requestJson(server, "GET", "/users/me", { authorization: `Bearer ${accessToken}` });
    assert.equal(profile.status, HTTP_OK);
  });

  it("re-registers the user from the refresh cookie alone", async () => {
    const cookie = `${REFRESH_COOKIE_NAME}=mock-refresh-token-${randomUUID()}`;
    const response = await fetch(`${server.baseUrl}/token/refresh`, { method: "POST", headers: { Cookie: cookie } });
    assert.equal(response.status, HTTP_OK);
  });

  const invalidCookies: Array<[string, Record<string, string>]> = [
    ["without a cookie", {}],
    ["with an unrelated cookie", { Cookie: "other=value" }],
    ["with a malformed refresh token", { Cookie: `${REFRESH_COOKIE_NAME}=mock-refresh-token-abc` }],
  ];
  for (const [description, headers] of invalidCookies) {
    it(`rejects a refresh ${description}`, async () => {
      const response: JsonResponse = await requestJson(server, "POST", "/token/refresh", { headers });
      assert.equal(response.status, HTTP_UNAUTHORIZED);
    });
  }
});

describe("GET /oauth2/authorization/google", () => {
  it("serves the mock Google login page", async () => {
    const response = await fetch(`${server.baseUrl}/oauth2/authorization/google`);
    assert.equal(response.status, HTTP_OK);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  });
});
