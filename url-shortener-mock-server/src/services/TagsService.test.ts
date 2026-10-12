import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import { createTestUser, type TestUser } from "../test-utils";
import { TagsService } from "./TagsService";

const SEEDED_TAG_COUNT = 5;
const SEEDED_WORK_TAG_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const ALLOWED_COLOR = "red";
let service: TagsService;
let user: TestUser;
let uuid: string;

beforeEach(() => {
  service = new TagsService();
  user = createTestUser();
  uuid = user.uuid;
});

describe("TagsService listing", () => {
  it("returns the first page with pagination metadata", () => {
    const page = service.getTags(uuid, 0, 2);
    assert.equal(page.content.length, 2);
    assert.equal(page.totalElements, SEEDED_TAG_COUNT);
    assert.equal(page.totalPages, 3);
    assert.equal(page.first, true);
    assert.equal(page.last, false);
    assert.equal(page.empty, false);
  });

  it("marks the final page as last", () => {
    const page = service.getTags(uuid, 2, 2);
    assert.equal(page.content.length, 1);
    assert.equal(page.last, true);
  });

  it("returns an empty page beyond the last one", () => {
    const page = service.getTags(uuid, 10, 2);
    assert.equal(page.empty, true);
    assert.equal(page.last, true);
  });

  it("filters by search text case-insensitively", () => {
    const page = service.getTags(uuid, 0, 10, "wORK");
    assert.deepEqual(page.content.map((tag) => tag.name), ["Work"]);
    assert.equal(page.totalElements, 1);
  });

  it("counts only the links associated with each tag", () => {
    const tag = service.createTag(uuid, { name: "Counted", color: ALLOWED_COLOR });
    assert.ok(tag);
    service.associateTagsWithLink(uuid, randomUUID(), [tag.id]);
    service.associateTagsWithLink(uuid, randomUUID(), [tag.id]);
    const counted = service.getTagsWithCount(uuid, 0, 1, "Counted").content[0];
    assert.equal(counted.linkCount, 2);
    const unused = service.createTag(uuid, { name: "Unused", color: ALLOWED_COLOR });
    assert.equal(service.getTagsWithCount(uuid, 0, 1, unused?.name).content[0].linkCount, 0);
  });
});

describe("TagsService creation", () => {
  it("creates a trimmed tag at the top of the list", () => {
    const created = service.createTag(uuid, { name: "  Fresh  ", color: ALLOWED_COLOR });
    assert.equal(created?.name, "Fresh");
    assert.equal(service.getTags(uuid, 0, 1).content[0].id, created?.id);
  });

  it("rejects a blank name", () => {
    assert.equal(service.createTag(uuid, { name: "   ", color: ALLOWED_COLOR }), null);
  });

  it("rejects a color outside the palette", () => {
    assert.equal(service.createTag(uuid, { name: "Fresh", color: "magenta" }), null);
  });

  it("rejects a duplicate name regardless of case", () => {
    assert.equal(service.createTag(uuid, { name: "wOrK", color: ALLOWED_COLOR }), null);
  });

  it("allows the same name for different users", () => {
    const otherUuid = createTestUser().uuid;
    service.createTag(uuid, { name: "Shared", color: ALLOWED_COLOR });
    assert.notEqual(service.createTag(otherUuid, { name: "Shared", color: ALLOWED_COLOR }), null);
  });
});

describe("TagsService update", () => {
  it("updates name and color", () => {
    const updated = service.updateTag(uuid, { id: SEEDED_WORK_TAG_ID, name: "Office", color: "cyan" });
    assert.deepEqual(updated, { id: SEEDED_WORK_TAG_ID, name: "Office", color: "cyan" });
  });

  it("allows re-casing the own name", () => {
    assert.equal(service.updateTag(uuid, { id: SEEDED_WORK_TAG_ID, name: "WORK", color: "blue" })?.name, "WORK");
  });

  it("rejects the name of another tag", () => {
    assert.equal(service.updateTag(uuid, { id: SEEDED_WORK_TAG_ID, name: "learning", color: "blue" }), null);
  });

  it("returns null for an unknown tag", () => {
    assert.equal(service.updateTag(uuid, { id: UNKNOWN_ID, name: "Any", color: "blue" }), null);
  });

  it("rejects a blank name and an invalid color", () => {
    assert.equal(service.updateTag(uuid, { id: SEEDED_WORK_TAG_ID, name: " ", color: "blue" }), null);
    assert.equal(service.updateTag(uuid, { id: SEEDED_WORK_TAG_ID, name: "Office", color: "pink" }), null);
  });
});

describe("TagsService deletion and associations", () => {
  it("detaches a deleted tag from every link", () => {
    assert.equal(service.deleteTag(uuid, SEEDED_WORK_TAG_ID), true);
    const remainingTagIds = [...user.state.tagAssociations.values()].flat();
    assert.equal(remainingTagIds.includes(SEEDED_WORK_TAG_ID), false);
  });

  it("drops the association entry when its last tag is removed", () => {
    const linkId = randomUUID();
    service.associateTagsWithLink(uuid, linkId, [SEEDED_WORK_TAG_ID]);
    service.deleteTag(uuid, SEEDED_WORK_TAG_ID);
    assert.deepEqual(service.getTagIdsForLink(uuid, linkId), []);
  });

  it("returns false when deleting an unknown tag", () => {
    assert.equal(service.deleteTag(uuid, UNKNOWN_ID), false);
  });

  it("replaces associations and removes duplicate ids", () => {
    const linkId = randomUUID();
    service.associateTagsWithLink(uuid, linkId, [SEEDED_WORK_TAG_ID, SEEDED_WORK_TAG_ID]);
    assert.deepEqual(service.getTagIdsForLink(uuid, linkId), [SEEDED_WORK_TAG_ID]);
    service.associateTagsWithLink(uuid, linkId, []);
    assert.deepEqual(service.getTagIdsForLink(uuid, linkId), []);
  });

  it("filters out unknown tag ids", () => {
    assert.deepEqual(service.validateAndFilterTagIds(uuid, [SEEDED_WORK_TAG_ID, UNKNOWN_ID]), [SEEDED_WORK_TAG_ID]);
  });

  it("reuses an existing tag by exact name", () => {
    assert.equal(service.findOrCreateTagByName(uuid, "Work").id, SEEDED_WORK_TAG_ID);
  });

  it("creates a missing tag with an allowed color", () => {
    const created = service.findOrCreateTagByName(uuid, "Brand new");
    assert.equal(service.getTags(uuid, 0, 1).content[0].id, created.id);
  });

  it("fails to auto-create a tag whose name differs from an existing one only by case", () => {
    assert.throws(() => service.findOrCreateTagByName(uuid, "work"), /Failed to auto-create tag/);
  });
});
