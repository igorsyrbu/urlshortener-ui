import {fetchWithAuth} from "@/lib/api";
import {ApiError, requestJson, requestNoContent} from "@/lib/api-request";
import type {LongUrlTitleResponse, PageDTO, RandomKeyResponse, ShortLinkDTO} from "@/lib/api-types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE, SHORT_KEY_TAKEN_MESSAGE} from "@/lib/constants";
import {HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_OK} from "@/lib/http-status";
import {logger} from "@/lib/logger";
import type {EditableLink, LinkItem} from "@/lib/types";

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
        isPasswordProtected: item.isPasswordProtected,
        tagIds: item.tagIds,
    };
}

/**
 * One link with its password, for the edit form and for rebuilding a full `PUT` body. The password is never cached:
 * keep the result only as long as the form (or the request) that asked for it.
 */
export async function getLinkById(id: string, signal?: AbortSignal): Promise<EditableLink> {
    const item = await requestJson<ShortLinkDTO>(API_ENDPOINTS.SHORTLINK_BY_ID(id), {cache: "no-store", signal});
    return {...mapResponseToLinkItem(item), key: item.key, password: item.password ?? null};
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

/**
 * `PUT /shortlinks` replaces the whole link, and a body without the password removes the protection. A list item never
 * holds the password, so the body is built from the link as the server has it now.
 */
export async function saveArchiveStatus(linkId: string, archived: boolean): Promise<boolean> {
    try {
        const link = await getLinkById(linkId);
        await requestNoContent(API_ENDPOINTS.SHORTLINKS, {
            method: "PUT",
            body: JSON.stringify({
                id: link.id,
                title: link.title,
                longUrl: link.longUrl,
                key: link.key,
                isActive: !archived,
                password: link.password,
                tagIds: [...(link.tagIds ?? [])],
            }),
        });
        return true;
    } catch (error) {
        logger.error("Failed to update link archive status", error, {linkId});
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
    isPasswordProtected?: boolean;
    tagIds?: string[];
}

export interface ShortLinkFields {
    longUrl: string;
    title: string;
    key: string;
    tagIds: string[];
    /** `null` saves the link without protection (on an update it removes an existing password). */
    password: string | null;
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
export function createShortLink({longUrl, title, key, tagIds, password}: ShortLinkFields): Promise<ShortLinkData> {
    return requestJson<ShortLinkData>(API_ENDPOINTS.SHORTLINKS, {
        method: "POST",
        body: JSON.stringify({longUrl, title, key, isActive: true, password: password ?? undefined, tagIds: tagIds.length > 0 ? [...tagIds] : undefined}),
    }).catch(throwKeyConflictOrRethrow);
}

/** Saves an edited link; rejects like `createShortLink`. `password` is always sent: the update replaces the whole link. */
export function updateShortLink(link: LinkItem, {longUrl, title, key, tagIds, password}: ShortLinkFields): Promise<void> {
    return requestNoContent(API_ENDPOINTS.SHORTLINKS, {
        method: "PUT",
        body: JSON.stringify({id: link.id, longUrl, title, key, isActive: link.isActive, password, tagIds: [...tagIds]}),
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
