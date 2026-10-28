import {describe, expect, it} from "vitest";
import {searchTags} from "@/lib/tag-search";
import type {TagItem} from "@/lib/types";

const TAGS: TagItem[] = [
    {id: "1", name: "Work", color: "blue"},
    {id: "2", name: "Learning", color: "green"},
    {id: "3", name: "Workshop", color: "red"},
];

function names(tags: TagItem[]): string[] {
    return tags.map((tag) => tag.name);
}

describe("searchTags", () => {
    it("lists every tag by name for an empty search and offers no create", () => {
        expect(searchTags(TAGS, "")).toEqual({matchingTags: [TAGS[1], TAGS[0], TAGS[2]], canCreateTag: false});
    });

    it("matches part of a name in any case", () => {
        expect(names(searchTags(TAGS, "wOR").matchingTags)).toEqual(["Work", "Workshop"]);
    });

    it("does not offer to create a tag that already exists, whatever the case or surrounding spaces", () => {
        const result = searchTags(TAGS, "  work ");

        expect(names(result.matchingTags)).toEqual(["Work", "Workshop"]);
        expect(result.canCreateTag).toBe(false);
    });

    it("offers to create a name no tag has", () => {
        expect(searchTags(TAGS, "Travel")).toEqual({matchingTags: [], canCreateTag: true});
    });

    it("offers no create for a search of spaces only", () => {
        expect(searchTags(TAGS, "   ").canCreateTag).toBe(false);
    });
});
