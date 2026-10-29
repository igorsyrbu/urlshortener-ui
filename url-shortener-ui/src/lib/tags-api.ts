import {requestJson, requestNoContent} from "@/lib/api-request";
import type {PageDTO} from "@/lib/api-types";
import type {BadgeVariant} from "@/components/ui/badge";
import {API_ENDPOINTS} from "@/lib/constants";
import type {TagItem} from "@/lib/types";

/** Tags per request. Badges and pickers need every tag, so all pages are loaded; a bigger page means fewer requests. */
export const TAGS_PAGE_SIZE = 100;

/** A safety stop for a backend that keeps reporting more pages; at `TAGS_PAGE_SIZE` it allows 10,000 tags. */
const MAX_TAG_PAGES = 100;

export interface TagListParams {
    /** Adds each tag's `linkCount` (the tags page); badges and pickers do not need it. */
    withLinksCount: boolean;
    /** Server-side name search; empty for every tag. */
    search: string;
}

type TagsResponse = PageDTO<TagItem> | TagItem[];

function readTags(data: TagsResponse): TagItem[] {
    return Array.isArray(data) ? data : data.content ?? [];
}

function readTotalPages(data: TagsResponse): number {
    if (Array.isArray(data)) return 1;
    return (data.page ?? data).totalPages ?? 1;
}

function buildTagsPageEndpoint({withLinksCount, search}: TagListParams, page: number): string {
    const query = new URLSearchParams({withLinksCount: String(withLinksCount), size: String(TAGS_PAGE_SIZE)});
    if (search) query.set("search", search);
    if (page > 0) query.set("page", String(page));
    return `${API_ENDPOINTS.TAGS}?${query}`;
}

/** Every page of tags for the params, in the server's order; rejects with the `ApiError` of the first failed page. */
export async function fetchAllTags(params: TagListParams, signal?: AbortSignal): Promise<TagItem[]> {
    const tags: TagItem[] = [];
    let totalPages = 1;
    for (let page = 0; page < Math.min(totalPages, MAX_TAG_PAGES); page += 1) {
        const data = await requestJson<TagsResponse>(buildTagsPageEndpoint(params, page), {signal});
        tags.push(...readTags(data));
        totalPages = readTotalPages(data);
    }
    return tags;
}

export function createTagRequest(name: string, color: BadgeVariant): Promise<TagItem> {
    return requestJson<TagItem>(API_ENDPOINTS.TAGS, {method: "POST", body: JSON.stringify({name: name.trim(), color})});
}

export function updateTagRequest(id: string, name: string, color: BadgeVariant): Promise<TagItem> {
    return requestJson<TagItem>(API_ENDPOINTS.TAGS, {method: "PUT", body: JSON.stringify({id, name: name.trim(), color})});
}

export function deleteTagRequest(id: string): Promise<void> {
    return requestNoContent(`${API_ENDPOINTS.TAGS}/${id}`, {method: "DELETE"});
}
