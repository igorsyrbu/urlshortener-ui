import {fetchWithAuth} from "@/lib/api";
import {requestJson} from "@/lib/api-request";
import type {PageDTO, ShortLinkDTO} from "@/lib/api-types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE} from "@/lib/constants";
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
