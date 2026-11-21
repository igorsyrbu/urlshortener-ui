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
    fetchLongUrlSuggestion,
    fetchRandomKey,
    getLinkById,
    isShortKeyTaken,
    saveArchiveStatus,
    saveBulkAction,
    saveSuspensionStatus,
    ShortKeyConflictError,
    updateShortLink,
    type LinksPageParams,
} from "@/lib/links-api";
import {logger} from "@/lib/logger";
import {createLinkItem, createPage, createProtectedShortLink, createShortLink} from "@/test/link-utils";

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

function sentBody(callIndex = 0): Record<string, unknown> {
    return JSON.parse(String(vi.mocked(fetchWithAuth).mock.calls[callIndex][1]?.body));
}

function mockStoredLink(link: ShortLinkDTO): void {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(link));
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

describe("saveBulkAction", () => {
    it("posts the link ids to the action's endpoint and returns the result", async () => {
        const result = {processedIds: ["a"], notFoundIds: ["b"]};
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(result));

        await expect(saveBulkAction("suspend", ["a", "b"])).resolves.toEqual(result);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(API_ENDPOINTS.SHORTLINKS_BULK("suspend"));
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("POST");
        expect(sentBody()).toEqual({ids: ["a", "b"]});
    });

    it("resolves null and logs when the server refuses", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 400}));

        await expect(saveBulkAction("delete", ["a"])).resolves.toBeNull();

        expect(logger.error).toHaveBeenCalled();
    });
});

describe("saveSuspensionStatus", () => {
    it("loads the stored link and sends it back whole, suspended, keeping its password and archive state", async () => {
        mockStoredLink(createProtectedShortLink("secret-pass", {id: "a", isActive: false}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await expect(saveSuspensionStatus("a", true)).resolves.toBe(true);

        expect(vi.mocked(fetchWithAuth).mock.calls[1][1]?.method).toBe("PUT");
        expect(sentBody(1)).toMatchObject({id: "a", isActive: false, isSuspended: true, password: "secret-pass"});
    });

    it("resumes a suspended link", async () => {
        mockStoredLink(createShortLink({isSuspended: true}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveSuspensionStatus("link-1", false);

        expect(sentBody(1).isSuspended).toBe(false);
    });

    it("resolves false and logs when the server refuses", async () => {
        mockStoredLink(createShortLink());
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        await expect(saveSuspensionStatus("link-1", true)).resolves.toBe(false);

        expect(logger.error).toHaveBeenCalled();
    });
});

const LINK_DESCRIPTION = "Docs for the launch";

describe("saveArchiveStatus", () => {
    it("loads the stored link and sends it back whole with inverted activity", async () => {
        const link = createShortLink({id: "a", tagIds: ["t1"]});
        mockStoredLink(link);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await expect(saveArchiveStatus("a", true)).resolves.toBe(true);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(API_ENDPOINTS.SHORTLINK_BY_ID("a"));
        expect(vi.mocked(fetchWithAuth).mock.calls[1][0]).toBe(API_ENDPOINTS.SHORTLINKS);
        expect(vi.mocked(fetchWithAuth).mock.calls[1][1]?.method).toBe("PUT");
        expect(sentBody(1)).toEqual({
            id: "a", title: link.title, description: null, longUrl: link.longUrl, key: link.key, isActive: false, isSuspended: false, password: null,
            tagIds: ["t1"],
        });
    });

    it("keeps the password of a protected link", async () => {
        mockStoredLink(createProtectedShortLink("secret-pass"));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveArchiveStatus("link-1", true);

        expect(sentBody(1).password).toBe("secret-pass");
    });

    it("keeps the description of the link", async () => {
        mockStoredLink(createShortLink({description: LINK_DESCRIPTION}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveArchiveStatus("link-1", true);

        expect(sentBody(1).description).toBe(LINK_DESCRIPTION);
    });

    it("reactivates a link when unarchiving", async () => {
        mockStoredLink(createShortLink({isActive: false}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveArchiveStatus("link-1", false);

        expect(sentBody(1).isActive).toBe(true);
    });

    it("sends an empty tag list for a link without tags", async () => {
        mockStoredLink(createShortLink({tagIds: undefined}));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));

        await saveArchiveStatus("link-1", true);

        expect(sentBody(1).tagIds).toEqual([]);
    });

    it("does not save when the stored link cannot be loaded", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_NOT_FOUND}));

        await expect(saveArchiveStatus("link-1", true)).resolves.toBe(false);

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it.each([
        ["refuses", () => vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_CONFLICT}))],
        ["cannot be reached", () => vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"))],
    ])("resolves false and logs when the server %s", async (_name, arrangeFailure) => {
        mockStoredLink(createShortLink());
        arrangeFailure();

        await expect(saveArchiveStatus("link-1", true)).resolves.toBe(false);

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

const LINK_PASSWORD = "secret-pass";
const LINK_FIELDS = {longUrl: "https://example.com", title: "Example", description: null, key: "ex", tagIds: ["tag-1"], password: null};

describe("createShortLink", () => {
    it("posts an active link and returns the created one", async () => {
        const created = {id: "link-1", title: "Example", longUrl: LINK_FIELDS.longUrl, shortUrl: "https://s.io/ex"};
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(created));

        const result = await requestShortLinkCreation(LINK_FIELDS);

        expect(result).toEqual(created);
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("POST");
        expect(sentBody()).toEqual({longUrl: LINK_FIELDS.longUrl, title: "Example", key: "ex", tagIds: ["tag-1"], isActive: true});
    });

    it("sends the password of a protected link", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({}));

        await requestShortLinkCreation({...LINK_FIELDS, password: LINK_PASSWORD});

        expect(sentBody().password).toBe(LINK_PASSWORD);
    });

    it("sends the description, and leaves it out when there is none", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json({}));

        await requestShortLinkCreation({...LINK_FIELDS, description: LINK_DESCRIPTION});
        await requestShortLinkCreation(LINK_FIELDS);

        expect(sentBody(0).description).toBe(LINK_DESCRIPTION);
        expect(sentBody(1)).not.toHaveProperty("description");
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
    it("puts the edited fields with the link's id, archive and suspension state", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({}));
        const link = createLinkItem({id: "link-1", isActive: false, isSuspended: true});

        await updateShortLink(link, LINK_FIELDS);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("PUT");
        expect(sentBody()).toEqual({id: "link-1", ...LINK_FIELDS, isActive: false, isSuspended: true});
    });

    it("always sends the description, since a missing one removes it", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json({}));

        await updateShortLink(createLinkItem(), {...LINK_FIELDS, description: LINK_DESCRIPTION});
        await updateShortLink(createLinkItem(), LINK_FIELDS);

        expect(sentBody(0).description).toBe(LINK_DESCRIPTION);
        expect(sentBody(1)).toHaveProperty("description", null);
    });

    it("always sends the password, since a missing one removes the protection", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json({}));

        await updateShortLink(createLinkItem(), {...LINK_FIELDS, password: LINK_PASSWORD});
        await updateShortLink(createLinkItem(), LINK_FIELDS);

        expect(sentBody(0).password).toBe(LINK_PASSWORD);
        expect(sentBody(1)).toHaveProperty("password", null);
    });

    it("rejects with a key conflict when the new key is taken", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_CONFLICT}));

        await expect(updateShortLink(createLinkItem(), LINK_FIELDS)).rejects.toBeInstanceOf(ShortKeyConflictError);
    });
});

describe("getLinkById", () => {
    it("asks for the link without caching and returns it with its password", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createProtectedShortLink(LINK_PASSWORD, {id: "a b"})));

        const link = await getLinkById("a b");

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(API_ENDPOINTS.SHORTLINK_BY_ID("a b"));
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.cache).toBe("no-store");
        expect(link).toMatchObject({id: "a b", isPasswordProtected: true, password: LINK_PASSWORD});
    });

    it("reports no password for an unprotected link", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createShortLink()));

        await expect(getLinkById("link-1")).resolves.toMatchObject({isPasswordProtected: false, password: null});
    });

    it("rejects with the ApiError of a missing link", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_NOT_FOUND}));

        await expect(getLinkById("link-1")).rejects.toHaveProperty("status", HTTP_NOT_FOUND);
    });
});

describe("fetchLongUrlSuggestion", () => {
    it("asks for the page title and description of the encoded URL and trims them", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({title: "  Example Domain  ", description: " For examples. "}));

        const suggestion = await fetchLongUrlSuggestion("https://example.com/?q=a b");

        expect(suggestion).toEqual({title: "Example Domain", description: "For examples."});
        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(`${API_ENDPOINTS.LONG_URL_TITLE}?url=${encodeURIComponent("https://example.com/?q=a b")}`);
    });

    it("gives null for a blank or missing title and description", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({title: "   ", description: null}));

        expect(await fetchLongUrlSuggestion("https://example.com")).toEqual({title: null, description: null});
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
