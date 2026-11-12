import type {PageDTO, ShortLinkDTO} from "@/lib/api-types";
import type {LinkItem} from "@/lib/types";

export function createShortLink(overrides: Partial<ShortLinkDTO> = {}): ShortLinkDTO {
    return {
        id: "link-1", title: "Example", key: "abc123", shortUrl: "https://sho.rt/abc123",
        longUrl: "https://example.com/article", isActive: true, isPasswordProtected: false, tagIds: [],
        createdAt: "2026-10-01T12:00:00Z", updatedAt: "2026-10-01T12:00:00Z",
        ...overrides,
    };
}

export function createLinkItem(overrides: Partial<LinkItem> = {}): LinkItem {
    return {
        id: "link-1", title: "Example", key: "abc123", shortUrl: "https://sho.rt/abc123",
        longUrl: "https://example.com/article", isActive: true, isPasswordProtected: false, tagIds: [],
        ...overrides,
    };
}

/** A link as `GET /shortlinks/{id}` answers it: with its password when protected. */
export function createProtectedShortLink(password: string, overrides: Partial<ShortLinkDTO> = {}): ShortLinkDTO {
    return createShortLink({isPasswordProtected: true, password, ...overrides});
}

export function createPage<T>(content: T[], overrides: Partial<PageDTO<T>> = {}): PageDTO<T> {
    return {
        content,
        page: {totalPages: 1, totalElements: content.length, size: content.length, number: 0},
        ...overrides,
    };
}
