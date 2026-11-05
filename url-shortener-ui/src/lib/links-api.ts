import {fetchWithAuth} from "@/lib/api";
import {ApiError, requestJson, requestNoContent} from "@/lib/api-request";
import type {LongUrlTitleResponse, PageDTO, RandomKeyResponse, ShortLinkDTO} from "@/lib/api-types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE, SHORT_KEY_TAKEN_MESSAGE} from "@/lib/constants";
import {HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_OK} from "@/lib/http-status";
import {logger} from "@/lib/logger";
import type {LinkItem} from "@/lib/types";

export interface LinksPageParams {
    page: number;
    showArchived: boolean;
    /** The committed search; empty for none. */
    search: string;
}

export interface LinksPage {
    links: LinkItem[];
    page: number;
    totalElements: number;
    totalPages: number;
}

export function mapResponseToLinkItem(item: ShortLinkDTO): LinkItem {
    return {
        id: item.id,
        title: item.title || DEFAULT_LINK_TITLE,
        key: item.key,
        shortUrl: item.shortUrl,
        longUrl: item.longUrl,
        isActive: item.isActive,
        tagIds: item.tagIds,
    };
}

function buildLinksPageEndpoint({page, showArchived, search}: LinksPageParams): string {
    const params = new URLSearchParams({page: String(page), size: String(DEFAULT_PAGE_SIZE), showArchived: String(showArchived)});
    if (search) params.set("search", search);
    return `${API_ENDPOINTS.SHORTLINKS}?${params}`;
}

export async function fetchLinksPage(params: LinksPageParams, signal?: AbortSignal): Promise<LinksPage> {
    const data = await requestJson<PageDTO<ShortLinkDTO>>(buildLinksPageEndpoint(params), {signal});
    const links = data.content.map(mapResponseToLinkItem);
    const pagination = data.page ?? data;
    return {
        links,
        page: pagination.number ?? params.page,
        totalElements: pagination.totalElements ?? links.length,
        totalPages: pagination.totalPages ?? 1,
    };
}

export async function saveArchiveStatus(link: LinkItem, archived: boolean): Promise<boolean> {
    try {
        const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
            method: "PUT",
            body: JSON.stringify({
                id: link.id,
                title: link.title,
                longUrl: link.longUrl,
                key: link.key,
                isActive: !archived,
                tagIds: [...(link.tagIds ?? [])],
            }),
        });
        if (!res.ok) logger.error("Failed to update link archive status", undefined, {status: res.status, linkId: link.id});
        return res.ok;
    } catch (error) {
        logger.error("Error updating link archive status", error);
        return false;
    }
}

export async function deleteShortLink(linkId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_ENDPOINTS.SHORTLINKS}/${linkId}`, {method: "DELETE"});
        if (!res.ok) logger.error("Failed to delete link", undefined, {status: res.status, linkId});
        return res.ok;
    } catch (error) {
        logger.error("Error deleting link", error, {linkId});
        return false;
    }
}

/** A link as the create endpoint returns it (the success screen shows it). */
export interface ShortLinkData {
    id: string;
    title: string;
    longUrl: string;
    shortUrl: string;
    isActive?: boolean;
    tagIds?: string[];
}

export interface ShortLinkFields {
    longUrl: string;
    title: string;
    key: string;
    tagIds: string[];
}

/** The key is taken (409); the link form shows the message next to the key field. */
export class ShortKeyConflictError extends ApiError {
    constructor() {
        super(HTTP_CONFLICT, SHORT_KEY_TAKEN_MESSAGE);
        this.name = "ShortKeyConflictError";
    }
}

function throwKeyConflictOrRethrow(error: unknown): never {
    if (error instanceof ApiError && error.status === HTTP_CONFLICT) throw new ShortKeyConflictError();
    throw error;
}

/** Rejects with `ShortKeyConflictError` for a taken key, otherwise with an `ApiError` or a network error. */
export function createShortLink({longUrl, title, key, tagIds}: ShortLinkFields): Promise<ShortLinkData> {
    return requestJson<ShortLinkData>(API_ENDPOINTS.SHORTLINKS, {
        method: "POST",
        body: JSON.stringify({longUrl, title, key, isActive: true, tagIds: tagIds.length > 0 ? [...tagIds] : undefined}),
    }).catch(throwKeyConflictOrRethrow);
}

/** Saves an edited link; rejects like `createShortLink`. */
export function updateShortLink(link: LinkItem, {longUrl, title, key, tagIds}: ShortLinkFields): Promise<void> {
    return requestNoContent(API_ENDPOINTS.SHORTLINKS, {
        method: "PUT",
        body: JSON.stringify({id: link.id, longUrl, title, key, isActive: link.isActive, tagIds: [...tagIds]}),
    }).catch(throwKeyConflictOrRethrow);
}

/** The page title the backend found at `longUrl`, or `null` when it found none. */
export async function fetchLongUrlTitle(longUrl: string): Promise<string | null> {
    const data = await requestJson<LongUrlTitleResponse>(`${API_ENDPOINTS.LONG_URL_TITLE}?url=${encodeURIComponent(longUrl)}`);
    return data.title?.trim() || null;
}

/** `true` when another link uses the key, `false` when it is free, `null` when the answer says neither. */
export async function isShortKeyTaken(key: string): Promise<boolean | null> {
    const response = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS_EXISTS(key));
    if (response.status === HTTP_OK) return true;
    if (response.status === HTTP_NOT_FOUND) return false;
    return null;
}

export async function fetchRandomKey(signal?: AbortSignal): Promise<string> {
    const data = await requestJson<RandomKeyResponse>(API_ENDPOINTS.SHORTLINKS_RANDOM, {signal});
    return data.key;
}
