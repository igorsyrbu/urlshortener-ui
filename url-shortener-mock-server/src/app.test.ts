import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createApp } from "./app";
import { DEFAULT_MOCK_CONFIG } from "./config";
import { createProblem } from "./problem";
import { requestJson, startTestServer, type TestServer } from "./test-utils";

const HTTP_OK = 200;
const HTTP_FOUND = 302;
const HTTP_NOT_FOUND = 404;
const FRONTEND_URL = "http://localhost:4321";

let server: TestServer;

before(async () => {
  const config = { ...DEFAULT_MOCK_CONFIG, frontendUrl: FRONTEND_URL, magicLinkCooldown: { enabled: false, seconds: 60 } };
  server = await startTestServer(createApp({ config }));
});

after(async () => {
  await server.close();
});

function requestMagicLink(email: string): Promise<Response> {
  return fetch(`${server.baseUrl}/ott/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email }),
  });
}

describe("createApp", () => {
  it("answers the health check", async () => {
    const response = await requestJson(server, "GET", "/health");
    assert.equal(response.status, HTTP_OK);
    assert.equal((response.body as { status: string }).status, "ok");
  });

  it("answers an unknown route with a problem-details 404 instead of an HTML page", async () => {
    const response = await requestJson(server, "DELETE", "/no/such/route");
    assert.deepEqual(response, { status: HTTP_NOT_FOUND, body: createProblem(HTTP_NOT_FOUND, "No mock route for DELETE /no/such/route.") });
  });

  it("redirects sign-ins to the configured frontend", async () => {
    const response = await fetch(`${server.baseUrl}/ott/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ loginType: "otp", email: "a@b.c", code: "123456" }),
      redirect: "manual",
    });
    assert.equal(response.status, HTTP_FOUND);
    assert.match(response.headers.get("location") ?? "", new RegExp(`^${FRONTEND_URL}/auth/exchange\\?code=mock-auth-code-`));
  });

  it("applies the configured magic-link cooldown setting", async () => {
    const first = await requestMagicLink("cooldown@example.test");
    const second = await requestMagicLink("cooldown@example.test");
    assert.equal(first.status, HTTP_OK);
    assert.equal(second.status, HTTP_OK);
  });

  it("keeps state per app: a second app starts without the first one's cooldowns", async () => {
    const coolingServer = await startTestServer(createApp({ config: DEFAULT_MOCK_CONFIG }));
    const otherServer = await startTestServer(createApp({ config: DEFAULT_MOCK_CONFIG }));
    try {
      const body = new URLSearchParams({ username: "per-app@example.test" });
      const headers = { "Content-Type": "application/x-www-form-urlencoded" };
      await fetch(`${coolingServer.baseUrl}/ott/generate`, { method: "POST", headers, body });
      const response = await fetch(`${otherServer.baseUrl}/ott/generate`, { method: "POST", headers, body });
      assert.equal(response.status, HTTP_OK);
    } finally {
      await coolingServer.close();
      await otherServer.close();
    }
  });
});
