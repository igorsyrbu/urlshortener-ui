import {TagItem} from "@/lib/types";
import type {PageDTO} from "@/lib/api-types";
import {API_ENDPOINTS} from "@/lib/constants";

/** Tags per request. Badges and pickers need every tag, so all pages are loaded; a bigger page means fewer requests. */
export const TAGS_PAGE_SIZE = 100;

/** A safety stop for a backend that keeps reporting more pages; at `TAGS_PAGE_SIZE` it allows 10,000 tags. */
const MAX_TAG_PAGES = 100;

interface TagStoreSet {
    tags?: TagItem[];
    error?: string | null;
}

type TagsResponse = PageDTO<TagItem> | TagItem[];

function readTags(data: TagsResponse): TagItem[] {
    return Array.isArray(data) ? data : data.content ?? [];
}

function readTotalPages(data: TagsResponse): number {
    if (Array.isArray(data)) return 1;
    return (data.page ?? data).totalPages ?? 1;
}

function buildPageQuery(query: URLSearchParams, page: number): URLSearchParams {
    const pageQuery = new URLSearchParams(query);
    if (page > 0) pageQuery.set("page", String(page));
    return pageQuery;
}

/** Loads every page of tags for `query` and stores them all, or stores the status of the first failed page. */
export async function fetchTagsResponse(
    query: URLSearchParams,
    set: (partial: TagStoreSet) => void,
    fetchWithAuth: (url: string) => Promise<Response>
): Promise<void> {
    const tags: TagItem[] = [];
    let totalPages = 1;
    for (let page = 0; page < Math.min(totalPages, MAX_TAG_PAGES); page += 1) {
        const res = await fetchWithAuth(`${API_ENDPOINTS.TAGS}?${buildPageQuery(query, page)}`);
        if (!res.ok) {
            set({error: `Failed to fetch tags: ${res.status}`});
            return;
        }
        const data: TagsResponse = await res.json();
        tags.push(...readTags(data));
        totalPages = readTotalPages(data);
    }
    set({tags});
}
