import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { createTestUser, requestJson, startTestServer, type TestServer, type TestUser } from "../test-utils";
import type { Session, User } from "../services/UsersService";

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
let server: TestServer;
let user: TestUser;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

beforeEach(() => {
  user = createTestUser();
});

async function listSessions(): Promise<Session[]> {
  const response = await requestJson(server, "GET", "/users/sessions", { authorization: user.authorization });
  return response.body as Session[];
}

describe("user profile endpoints", () => {
  it("returns the profile of the authenticated user", async () => {
    const response = await requestJson(server, "GET", "/users/me", { authorization: user.authorization });
    assert.equal((response.body as User).accountId, `acc-${user.uuid.slice(0, 8)}`);
  });

  it("renames the user", async () => {
    const response = await requestJson(server, "PUT", "/users/me/name", { authorization: user.authorization, body: { name: "Jane" } });
    assert.equal((response.body as User).name, "Jane");
    const profile = await requestJson(server, "GET", "/users/me", { authorization: user.authorization });
    assert.equal((profile.body as User).name, "Jane");
  });

  const invalidNames: Array<[string, unknown]> = [["missing", {}], ["empty", { name: "" }], ["not a string", { name: 3 }]];
  for (const [description, body] of invalidNames) {
    it(`rejects a name that is ${description}`, async () => {
      const response = await requestJson(server, "PUT", "/users/me/name", { authorization: user.authorization, body });
      assert.equal(response.status, HTTP_BAD_REQUEST);
    });
  }
});

describe("user preferences endpoints", () => {
  it("returns and updates the url cleaner mode", async () => {
    const updated = await requestJson(server, "PUT", "/users/me/preferences", { authorization: user.authorization, body: { urlCleanerMode: "AUTO_CLEAN" } });
    assert.deepEqual(updated.body, { urlCleanerMode: "AUTO_CLEAN" });
    const current = await requestJson(server, "GET", "/users/me/preferences", { authorization: user.authorization });
    assert.deepEqual(current.body, { urlCleanerMode: "AUTO_CLEAN" });
  });

  it("rejects an unknown mode", async () => {
    const response = await requestJson(server, "PUT", "/users/me/preferences", { authorization: user.authorization, body: { urlCleanerMode: "NOPE" } });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });

  it("rejects a request without body", async () => {
    const response = await requestJson(server, "PUT", "/users/me/preferences", { authorization: user.authorization });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });
});

describe("session endpoints", () => {
  it("terminates other sessions and keeps the current one", async () => {
    const response = await requestJson(server, "DELETE", "/users/sessions/other", { authorization: user.authorization });
    assert.equal(response.status, HTTP_OK);
    const sessions = await listSessions();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].current, true);
  });

  it("terminates the current session", async () => {
    await requestJson(server, "DELETE", "/users/sessions/current", { authorization: user.authorization });
    assert.equal((await listSessions()).some((session) => session.current), false);
  });

  it("terminates a session by id and then reports it missing", async () => {
    const [target] = (await listSessions()).filter((session) => !session.current);
    const first = await requestJson(server, "DELETE", `/users/sessions/${target.id}`, { authorization: user.authorization });
    const second = await requestJson(server, "DELETE", `/users/sessions/${target.id}`, { authorization: user.authorization });
    assert.equal(first.status, HTTP_OK);
    assert.equal(second.status, HTTP_NOT_FOUND);
  });

  it("reports an unknown session id as not found", async () => {
    const response = await requestJson(server, "DELETE", `/users/sessions/${UNKNOWN_ID}`, { authorization: user.authorization });
    assert.equal(response.status, HTTP_NOT_FOUND);
  });
});
