import type {TagItem} from "@/lib/types";

export function createTag(overrides: Partial<TagItem> = {}): TagItem {
    return {id: "tag-1", name: "Marketing", color: "blue", ...overrides};
}
