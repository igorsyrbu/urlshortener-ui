import type {TagItem} from "@/lib/types";

export interface TagSearchResult {
    /** Tags whose name contains the search, ignoring case and surrounding spaces, sorted by name. */
    matchingTags: TagItem[];
    /** The search names a tag that does not exist yet, so "Create" can be offered. */
    canCreateTag: boolean;
}

function compareByName(first: TagItem, second: TagItem): number {
    return first.name.localeCompare(second.name);
}

export function searchTags(tags: TagItem[], search: string): TagSearchResult {
    const query = search.trim().toLowerCase();
    const matchingTags = tags.filter((tag) => tag.name.toLowerCase().includes(query)).sort(compareByName);
    const hasExactMatch = matchingTags.some((tag) => tag.name.toLowerCase() === query);
    return {matchingTags, canCreateTag: query !== "" && !hasExactMatch};
}
