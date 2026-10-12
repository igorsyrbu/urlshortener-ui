import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { createTestUser, requestJson, startTestServer, type TestServer, type TestUser } from "../test-utils";
import type { Page, Tag, TagWithCount } from "../services/TagsService";

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const DEFAULT_PAGE_SIZE = 20;
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

async function createTag(name: string, color = "red"): Promise<Tag> {
  const response = await requestJson(server, "POST", "/tags", { authorization: user.authorization, body: { name, color } });
  assert.equal(response.status, HTTP_CREATED);
  return response.body as Tag;
}

describe("GET /tags", () => {
  it("returns the first page with the default size", async () => {
    const response = await requestJson(server, "GET", "/tags", { authorization: user.authorization });
    const page = response.body as Page<Tag>;
    assert.equal(response.status, HTTP_OK);
    assert.equal(page.size, DEFAULT_PAGE_SIZE);
    assert.equal(page.number, 0);
  });

  it("falls back to safe paging values for invalid query params", async () => {
    const response = await requestJson(server, "GET", "/tags?page=-4&size=abc", { authorization: user.authorization });
    const page = response.body as Page<Tag>;
    assert.equal(page.number, 0);
    assert.equal(page.size, DEFAULT_PAGE_SIZE);
  });

  it("adds link counts only when requested", async () => {
    const plain = await requestJson(server, "GET", "/tags?search=work", { authorization: user.authorization });
    const counted = await requestJson(server, "GET", "/tags?search=work&withLinksCount=true", { authorization: user.authorization });
    assert.equal("linkCount" in (plain.body as Page<Tag>).content[0], false);
    assert.equal(typeof (counted.body as Page<TagWithCount>).content[0].linkCount, "number");
  });

  it("does not leak tags between users", async () => {
    await createTag("Private");
    const otherUser = createTestUser();
    const response = await requestJson(server, "GET", "/tags?search=private", { authorization: otherUser.authorization });
    assert.equal((response.body as Page<Tag>).empty, true);
  });
});

describe("POST /tags", () => {
  it("creates a tag", async () => {
    const created = await createTag("Fresh", "cyan");
    assert.equal(created.name, "Fresh");
    assert.equal(created.color, "cyan");
  });

  const invalidBodies: Array<[string, unknown]> = [
    ["a missing name", { color: "red" }],
    ["a non-string name", { name: 5, color: "red" }],
    ["a missing color", { name: "X" }],
    ["an unsupported color", { name: "X", color: "magenta" }],
    ["a duplicate name", { name: "Work", color: "red" }],
  ];
  for (const [description, body] of invalidBodies) {
    it(`rejects ${description}`, async () => {
      const response = await requestJson(server, "POST", "/tags", { authorization: user.authorization, body });
      assert.equal(response.status, HTTP_BAD_REQUEST);
    });
  }
});

describe("PUT /tags", () => {
  it("renames and recolors a tag", async () => {
    const tag = await createTag("Before");
    const response = await requestJson(server, "PUT", "/tags", { authorization: user.authorization, body: { id: tag.id, name: "After", color: "lime" } });
    assert.deepEqual(response.body, { id: tag.id, name: "After", color: "lime" });
  });

  it("returns not found for an unknown tag", async () => {
    const response = await requestJson(server, "PUT", "/tags", { authorization: user.authorization, body: { id: UNKNOWN_ID, name: "X", color: "red" } });
    assert.equal(response.status, HTTP_NOT_FOUND);
  });

  it("rejects a request without id", async () => {
    const response = await requestJson(server, "PUT", "/tags", { authorization: user.authorization, body: { name: "X", color: "red" } });
    assert.equal(response.status, HTTP_BAD_REQUEST);
  });
});

describe("DELETE /tags/:id", () => {
  it("deletes a tag with no content and then reports it missing", async () => {
    const tag = await createTag("Temporary");
    const first = await requestJson(server, "DELETE", `/tags/${tag.id}`, { authorization: user.authorization });
    const second = await requestJson(server, "DELETE", `/tags/${tag.id}`, { authorization: user.authorization });
    assert.equal(first.status, HTTP_NO_CONTENT);
    assert.equal(second.status, HTTP_NOT_FOUND);
  });
});
