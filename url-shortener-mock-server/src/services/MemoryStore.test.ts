import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { MemoryStore } from "./MemoryStore";
import { DEFAULT_URL_CLEANER_MODE } from "./UsersService";

const UUID_PREFIX_LENGTH = 8;
let store: MemoryStore;

beforeEach(() => {
  store = new MemoryStore();
});

describe("MemoryStore", () => {
  it("throws when state is requested for an unregistered user", () => {
    const uuid = randomUUID();
    assert.throws(() => store.getUserState(uuid), new RegExp(uuid));
    assert.equal(store.hasUserState(uuid), false);
  });

  it("seeds a registered user with links, tags, sessions and default preferences", () => {
    const state = store.registerUserSession(randomUUID());
    assert.ok(state.links.length > 0);
    assert.ok(state.tags.length > 0);
    assert.ok(state.sessions.some((session) => session.current));
    assert.deepEqual(state.preferences, { urlCleanerMode: DEFAULT_URL_CLEANER_MODE });
  });

  it("derives the user identity from the uuid prefix", () => {
    const uuid = randomUUID();
    const prefix = uuid.slice(0, UUID_PREFIX_LENGTH);
    const { user } = store.registerUserSession(uuid);
    assert.equal(user.email, `john.doe@${prefix}.dev`);
    assert.equal(user.accountId, `acc-${prefix}`);
  });

  it("keeps the existing state when the same user registers again", () => {
    const uuid = randomUUID();
    const first = store.registerUserSession(uuid);
    first.links = [];
    assert.equal(store.registerUserSession(uuid), first);
    assert.equal(store.getUserState(uuid).links.length, 0);
  });

  it("isolates mutations between users", () => {
    const first = store.registerUserSession(randomUUID());
    const second = store.registerUserSession(randomUUID());
    const initialSecondLinkCount = second.links.length;
    first.links = [];
    first.tags.pop();
    first.user.name = "Changed";
    first.preferences.urlCleanerMode = "DISABLE";
    first.sessions.length = 0;
    assert.equal(second.links.length, initialSecondLinkCount);
    assert.equal(second.user.name, "John Doe");
    assert.equal(second.preferences.urlCleanerMode, DEFAULT_URL_CLEANER_MODE);
    assert.ok(second.sessions.length > 0);
  });

  it("gives every user a fresh copy of the seeded tag associations", () => {
    const first = store.registerUserSession(randomUUID());
    const second = store.registerUserSession(randomUUID());
    first.tagAssociations.clear();
    assert.ok(second.tagAssociations.size > 0);
  });

  it("lists all registered user states", () => {
    store.registerUserSession(randomUUID());
    store.registerUserSession(randomUUID());
    assert.equal(store.getAllUserStates().length, 2);
  });
});
