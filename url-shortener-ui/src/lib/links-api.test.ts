import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {ApiError} from "@/lib/api-request";
import type {PageDTO, ShortLinkDTO} from "@/lib/api-types";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE} from "@/lib/constants";
import {HTTP_CONFLICT, HTTP_INTERNAL_SERVER_ERROR, HTTP_NO_CONTENT, HTTP_NOT_FOUND, HTTP_OK} from "@/lib/http-status";
import {
    createShortLink as requestShortLinkCreation,
    deleteShortLink,
    fetchLinksPage,
    fetchLongUrlTitle,
    fetchRandomKey,
    isShortKeyTaken,
    saveArchiveStatus,
    ShortKeyConflictError,
    updateShortLink,
    type LinksPageParams,
} from "@/lib/links-api";
import {logger} from "@/lib/logger";
import {createLinkItem, createPage, createShortLink} from "@/test/link-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const FIRST_PAGE: LinksPageParams = {page: 0, showArchived: false, search: ""};

function requestedParams(callIndex = 0): URLSearchParams {
    const [url] = vi.mocked(fetchWithAuth).mock.calls[callIndex];
    return new URLSearchParams(url.split("?")[1]);
}

function mockLinksPage(content: ShortLinkDTO[], overrides: Partial<PageDTO<ShortLinkDTO>> = {}): void {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createPage(content, overrides)));
}

function sentBody(): Record<string, unknown> {
    return JSON.parse(String(vi.mocked(fetchWithAuth).mock.calls[0][1]?.body));
}

describe("fetchLinksPage", () => {
    it("maps the response to link items with its pagination", async () => {
        mockLinksPage([createShortLink({id: "a", tagIds: ["t1"]})], {
            page: {totalPages: 4, totalElements: 70, size: DEFAULT_PAGE_SIZE, number: 2},
        });

        const page = await fetchLinksPage({...FIRST_PAGE, page: 2});

        expect(page.links.map((link) => [link.id, link.tagIds])).toEqual([["a", ["t1"]]]);
        expect(page).toMatchObject({page: 2, totalElements: 70, totalPages: 4});
    });

    it("requests the page with the default size, the archived flag and no search", async () => {
        mockLinksPage([]);

        await fetchLinksPage({...FIRST_PAGE, page: 3});

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0].startsWith(`${API_ENDPOINTS.SHORTLINKS}?`)).toBe(true);
        expect(Object.fromEntries(requestedParams())).toEqual({page: "3", size: String(DEFAULT_PAGE_SIZE), showArchived: "false"});
    });

    it("includes the search and the archived flag", async () => {
        mockLinksPage([]);

        await fetchLinksPage({page: 0, showArchived: true, search: "docs"});

        expect(requestedParams().get("search")).toBe("docs");
        expect(requestedParams().get("showArchived")).toBe("true");
    });

    it("passes the abort signal on", async () => {
        mockLinksPage([]);
        const controller = new AbortController();

        await fetchLinksPage(FIRST_PAGE, controller.signal);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal).toBe(controller.signal);
    });

    it("replaces empty titles with the default link title", async () => {
        mockLinksPage([createShortLink({title: ""})]);

        const page = await fetchLinksPage(FIRST_PAGE);

        expect(page.links[0].title).toBe(DEFAULT_LINK_TITLE);
    });

    it("reads pagination from the top level of a flat page response", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({content: [createShortLink()], number: 1, totalElements: 21, totalPages: 2}));

        await expect(fetchLinksPage({...FIRST_PAGE, page: 1})).resolves.toMatchObject({page: 1, totalElements: 21, totalPages: 2});
    });

    it("derives pagination from the content when the response omits it", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({content: [createShortLink(), createShortLink({id: "b"})]}));

        await expect(fetchLinksPage(FIRST_PAGE)).resolves.toMatchObject({page: 0, totalElements: 2, totalPages: 1});
    });

    it("rejects with an ApiError carrying the status when the response is an error", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

        const error = await fetchLinksPage(FIRST_PAGE).catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({status: HTTP_INTERNAL_SERVER_ERROR});
    });
});

describe("saveArchiveStatus", () => {
    it("sends the full link with inverted activity", async () => {
        const link = createLinkItem({id: "a", tagIds: ["t1"]});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await expect(saveArchiveStatus(link, true)).resolves.toBe(true);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(API_ENDPOINTS.SHORTLINKS);
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("PUT");
        expect(sentBody()).toEqual({id: "a", title: link.title, longUrl: link.longUrl, key: link.key, isActive: false, tagIds: ["t1"]});
    });

    it("reactivates a link when unarchiving", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveArchiveStatus(createLinkItem({isActive: false}), false);

        expect(sentBody().isActive).toBe(true);
    });

    it("sends an empty tag list for a link without tags", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveArchiveStatus(createLinkItem({tagIds: undefined}), true);

        expect(sentBody().tagIds).toEqual([]);
    });

    it.each([
        ["refuses", () => vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_CONFLICT}))],
        ["cannot be reached", () => vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"))],
    ])("resolves false and logs when the server %s", async (_name, arrangeFailure) => {
        arrangeFailure();

        await expect(saveArchiveStatus(createLinkItem(), true)).resolves.toBe(false);

        expect(logger.error).toHaveBeenCalled();
    });
});

describe("deleteShortLink", () => {
    it("deletes the link by id", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_NO_CONTENT}));

        await expect(deleteShortLink("a")).resolves.toBe(true);

        expect(vi.mocked(fetchWithAuth).mock.calls[0]).toEqual([`${API_ENDPOINTS.SHORTLINKS}/a`, {method: "DELETE"}]);
    });

    it.each([
        ["refuses", () => vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}))],
        ["cannot be reached", () => vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"))],
    ])("resolves false and logs when the server %s", async (_name, arrangeFailure) => {
        arrangeFailure();

        await expect(deleteShortLink("a")).resolves.toBe(false);

        expect(logger.error).toHaveBeenCalled();
    });
});

const LINK_FIELDS = {longUrl: "https://example.com", title: "Example", key: "ex", tagIds: ["tag-1"]};

describe("createShortLink", () => {
    it("posts an active link and returns the created one", async () => {
        const created = {id: "link-1", title: "Example", longUrl: LINK_FIELDS.longUrl, shortUrl: "https://s.io/ex"};
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(created));

        const result = await requestShortLinkCreation(LINK_FIELDS);

        expect(result).toEqual(created);
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("POST");
        expect(sentBody()).toEqual({...LINK_FIELDS, isActive: true});
    });

    it("leaves tag ids out when the link has none", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({}));

        await requestShortLinkCreation({...LINK_FIELDS, tagIds: []});

        expect(sentBody()).not.toHaveProperty("tagIds");
    });

    it("rejects with a key conflict, which is also an ApiError, when the key is taken", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_CONFLICT}));

        const error = await requestShortLinkCreation(LINK_FIELDS).catch((rejection: unknown) => rejection);

        expect(error).toBeInstanceOf(ShortKeyConflictError);
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toHaveProperty("status", HTTP_CONFLICT);
    });

    it("rejects with an ApiError for any other failure", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

        const error = await requestShortLinkCreation(LINK_FIELDS).catch((rejection: unknown) => rejection);

        expect(error).not.toBeInstanceOf(ShortKeyConflictError);
        expect(error).toHaveProperty("status", HTTP_INTERNAL_SERVER_ERROR);
    });
});

describe("updateShortLink", () => {
    it("puts the edited fields with the link's id and archive state", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({}));
        const link = createLinkItem({id: "link-1", isActive: false});

        await updateShortLink(link, LINK_FIELDS);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("PUT");
        expect(sentBody()).toEqual({id: "link-1", ...LINK_FIELDS, isActive: false});
    });

    it("rejects with a key conflict when the new key is taken", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_CONFLICT}));

        await expect(updateShortLink(createLinkItem(), LINK_FIELDS)).rejects.toBeInstanceOf(ShortKeyConflictError);
    });
});

describe("fetchLongUrlTitle", () => {
    it("asks for the page title of the encoded URL and trims it", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({title: "  Example Domain  "}));

        const title = await fetchLongUrlTitle("https://example.com/?q=a b");

        expect(title).toBe("Example Domain");
        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(`${API_ENDPOINTS.LONG_URL_TITLE}?url=${encodeURIComponent("https://example.com/?q=a b")}`);
    });

    it("returns null when the page has no title", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({title: "   "}));

        expect(await fetchLongUrlTitle("https://example.com")).toBeNull();
    });
});

describe("isShortKeyTaken", () => {
    it.each([
        [HTTP_OK, true],
        [HTTP_NOT_FOUND, false],
        [HTTP_INTERNAL_SERVER_ERROR, null],
    ])("reads status %i as %s", async (status, expected) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status}));

        expect(await isShortKeyTaken("ex")).toBe(expected);
        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(API_ENDPOINTS.SHORTLINKS_EXISTS("ex"));
    });
});

describe("fetchRandomKey", () => {
    it("returns the generated key", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({key: "aB3dE"}));

        expect(await fetchRandomKey()).toBe("aB3dE");
    });
});
