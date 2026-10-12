import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { createTestUser, type TestUser } from "../test-utils";
import { DEFAULT_URL_CLEANER_MODE, URL_CLEANER_MODES, usersService } from "./UsersService";

const UNKNOWN_SESSION_ID = "00000000-0000-4000-8000-000000000000";
let user: TestUser;

beforeEach(() => {
  user = createTestUser();
});

describe("UsersService profile", () => {
  it("returns the seeded profile of the user", () => {
    assert.equal(usersService.getUser(user.uuid).accountId, `acc-${user.uuid.slice(0, 8)}`);
  });

  it("updates only the name of the requested user", () => {
    const other = createTestUser();
    const updated = usersService.updateUserName(user.uuid, "Jane Roe");
    assert.equal(updated.name, "Jane Roe");
    assert.equal(usersService.getUser(user.uuid).name, "Jane Roe");
    assert.equal(usersService.getUser(other.uuid).name, "John Doe");
  });

  it("throws for a user that never logged in", () => {
    assert.throws(() => usersService.getUser(randomUUID()), /not initialized/);
  });
});

describe("UsersService sessions", () => {
  it("lists exactly one current session", () => {
    assert.equal(usersService.getSessions(user.uuid).filter((session) => session.current).length, 1);
  });

  it("deletes only the current session", () => {
    usersService.deleteCurrentSession(user.uuid);
    const sessions = usersService.getSessions(user.uuid);
    assert.ok(sessions.length > 0);
    assert.equal(sessions.some((session) => session.current), false);
  });

  it("deletes every session except the current one", () => {
    usersService.deleteOtherSessions(user.uuid);
    const sessions = usersService.getSessions(user.uuid);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].current, true);
  });

  it("deletes a session by id", () => {
    const [target] = usersService.getSessions(user.uuid).filter((session) => !session.current);
    assert.equal(usersService.deleteSession(user.uuid, target.id), true);
    assert.equal(usersService.getSessions(user.uuid).some((session) => session.id === target.id), false);
  });

  it("reports false for an unknown session id", () => {
    const sessionCount = usersService.getSessions(user.uuid).length;
    assert.equal(usersService.deleteSession(user.uuid, UNKNOWN_SESSION_ID), false);
    assert.equal(usersService.getSessions(user.uuid).length, sessionCount);
  });

  it("does not affect the sessions of other users", () => {
    const other = createTestUser();
    const otherSessionCount = usersService.getSessions(other.uuid).length;
    usersService.deleteOtherSessions(user.uuid);
    assert.equal(usersService.getSessions(other.uuid).length, otherSessionCount);
  });
});

describe("UsersService preferences", () => {
  it("defaults to the suggest mode", () => {
    assert.deepEqual(usersService.getPreferences(user.uuid), { urlCleanerMode: DEFAULT_URL_CLEANER_MODE });
  });

  for (const mode of URL_CLEANER_MODES) {
    it(`accepts the ${mode} mode`, () => {
      assert.deepEqual(usersService.updatePreferences(user.uuid, mode), { urlCleanerMode: mode });
      assert.equal(usersService.getPreferences(user.uuid).urlCleanerMode, mode);
    });
  }

  const invalidModes: Array<[string, unknown]> = [
    ["an unknown string", "EXPLODE"],
    ["a lower-case mode", "disable"],
    ["a number", 1],
    ["undefined", undefined],
    ["null", null],
  ];
  for (const [description, mode] of invalidModes) {
    it(`rejects ${description} and keeps the current mode`, () => {
      assert.equal(usersService.updatePreferences(user.uuid, mode), null);
      assert.equal(usersService.getPreferences(user.uuid).urlCleanerMode, DEFAULT_URL_CLEANER_MODE);
    });
  }
});
