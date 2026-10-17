import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, DEFAULT_PAGE_SIZE, SHOW_ARCHIVED_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {PageDTO, ShortLinkDTO} from "@/lib/api-types";
import {useLinkStore} from "@/lib/store/links";
import {createLinkItem, createPage, createShortLink} from "@/test/link-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const initialState = useLinkStore.getInitialState();

function requestedParams(callIndex = 0): URLSearchParams {
    const [url] = vi.mocked(fetchWithAuth).mock.calls[callIndex];
    return new URLSearchParams(url.split("?")[1]);
}

function mockLinksPage(content: ShortLinkDTO[], overrides: Partial<PageDTO<ShortLinkDTO>> = {}): void {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createPage(content, overrides)));
}

describe("link store fetching", () => {
    afterEach(() => {
        useLinkStore.setState(initialState, true);
    });

    it("maps the response to link items and applies pagination metadata", async () => {
        mockLinksPage([createShortLink({id: "a", tagIds: ["t1"]})], {
            page: {totalPages: 4, totalElements: 70, size: DEFAULT_PAGE_SIZE, number: 2},
        });

        await useLinkStore.getState().fetchLinks(2);

        expect(useLinkStore.getState().links).toEqual([createLinkItem({id: "a", tagIds: ["t1"]})]);
        expect(useLinkStore.getState().currentPage).toBe(2);
        expect(useLinkStore.getState().totalElements).toBe(70);
        expect(useLinkStore.getState().totalPages).toBe(4);
        expect(useLinkStore.getState().loading).toBe(false);
    });

    it("requests the page with the default size, archived flag and no search", async () => {
        mockLinksPage([]);

        await useLinkStore.getState().fetchLinks(3);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0].startsWith(`${API_ENDPOINTS.SHORTLINKS}?`)).toBe(true);
        expect(requestedParams().get("page")).toBe("3");
        expect(requestedParams().get("size")).toBe(String(DEFAULT_PAGE_SIZE));
        expect(requestedParams().get("showArchived")).toBe("false");
        expect(requestedParams().has("search")).toBe(false);
    });

    it("includes the search query and archived flag in the request", async () => {
        mockLinksPage([]);
        useLinkStore.setState({searchQuery: "docs", showArchived: true});

        await useLinkStore.getState().fetchLinks();

        expect(requestedParams().get("search")).toBe("docs");
        expect(requestedParams().get("showArchived")).toBe("true");
    });

    it("refetches the current page when no page is given", async () => {
        mockLinksPage([]);
        useLinkStore.setState({currentPage: 5});

        await useLinkStore.getState().fetchLinks();

        expect(requestedParams().get("page")).toBe("5");
    });

    it("clamps a negative page to the first page", async () => {
        mockLinksPage([]);

        await useLinkStore.getState().fetchLinks(-4);

        expect(requestedParams().get("page")).toBe("0");
    });

    it("replaces empty titles with the default link title", async () => {
        mockLinksPage([createShortLink({title: ""})]);

        await useLinkStore.getState().fetchLinks();

        expect(useLinkStore.getState().links[0].title).toBe(DEFAULT_LINK_TITLE);
    });

    it("reads pagination from the top level of a flat page response", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({
            content: [createShortLink()], number: 1, totalElements: 21, totalPages: 2,
        }));

        await useLinkStore.getState().fetchLinks(1);

        expect(useLinkStore.getState().currentPage).toBe(1);
        expect(useLinkStore.getState().totalElements).toBe(21);
        expect(useLinkStore.getState().totalPages).toBe(2);
    });

    it("derives pagination from the content when the response omits it", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({content: [createShortLink(), createShortLink({id: "b"})]}));

        await useLinkStore.getState().fetchLinks(0);

        expect(useLinkStore.getState().totalElements).toBe(2);
        expect(useLinkStore.getState().totalPages).toBe(1);
    });

    it("shows an empty list for an empty page", async () => {
        mockLinksPage([]);
        useLinkStore.setState({links: [createLinkItem()]});

        await useLinkStore.getState().fetchLinks();

        expect(useLinkStore.getState().links).toEqual([]);
        expect(useLinkStore.getState().totalElements).toBe(0);
    });

    it("exposes the HTTP status and keeps existing links when the response is an error", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        useLinkStore.setState({links: [createLinkItem()]});

        await useLinkStore.getState().fetchLinks();

        expect(useLinkStore.getState().error).toBe("Failed to fetch links: 500");
        expect(useLinkStore.getState().links).toHaveLength(1);
        expect(useLinkStore.getState().loading).toBe(false);
    });

    it("exposes the error message and logs it when the request rejects", async () => {
        const failure = new Error("offline");
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(failure);

        await useLinkStore.getState().fetchLinks();

        expect(useLinkStore.getState().error).toBe("offline");
        expect(useLinkStore.getState().loading).toBe(false);
        expect(logger.error).toHaveBeenCalledWith("Error fetching links", failure);
    });

    it("falls back to a generic message when a non-Error value is thrown", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValueOnce("boom");

        await useLinkStore.getState().fetchLinks();

        expect(useLinkStore.getState().error).toBe("Unknown error occurred");
    });

    it("clears a previous error when fetching again and on demand", async () => {
        useLinkStore.setState({error: "old"});
        mockLinksPage([]);

        await useLinkStore.getState().fetchLinks();
        expect(useLinkStore.getState().error).toBeNull();

        useLinkStore.setState({error: "again"});
        useLinkStore.getState().clearError();
        expect(useLinkStore.getState().error).toBeNull();
    });

    it("applies only the newest request when an older one answers last", async () => {
        const olderResponse = Promise.withResolvers<Response>();
        vi.mocked(fetchWithAuth).mockReturnValueOnce(olderResponse.promise);
        mockLinksPage([createShortLink({id: "newest", title: "Newest"})]);

        const older = useLinkStore.getState().fetchLinks(0);
        await useLinkStore.getState().fetchLinks(1);
        olderResponse.resolve(Response.json(createPage([createShortLink({id: "older", title: "Older"})])));
        await older;

        expect(useLinkStore.getState().links.map((link) => link.id)).toEqual(["newest"]);
        expect(useLinkStore.getState().loading).toBe(false);
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal?.aborted).toBe(true);
    });

    it("stays loading until the newest request answers", async () => {
        const newestResponse = Promise.withResolvers<Response>();
        mockLinksPage([]);
        vi.mocked(fetchWithAuth).mockReturnValueOnce(newestResponse.promise);

        const older = useLinkStore.getState().fetchLinks(0);
        const newest = useLinkStore.getState().fetchLinks(1);
        await older;

        expect(useLinkStore.getState().loading).toBe(true);
        newestResponse.resolve(Response.json(createPage([])));
        await newest;
        expect(useLinkStore.getState().loading).toBe(false);
    });
});

describe("link store archived preference", () => {
    afterEach(() => {
        useLinkStore.setState(initialState, true);
    });

    it("persists the flag to localStorage when it changes", () => {
        useLinkStore.getState().setShowArchived(true);

        expect(useLinkStore.getState().showArchived).toBe(true);
        expect(localStorage.getItem(SHOW_ARCHIVED_STORAGE_KEY)).toBe("true");
    });

    it("still updates the state and logs when localStorage rejects the write", () => {
        vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });

        useLinkStore.getState().setShowArchived(true);

        expect(useLinkStore.getState().showArchived).toBe(true);
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("restores a stored true value", () => {
        localStorage.setItem(SHOW_ARCHIVED_STORAGE_KEY, "true");

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(true);
    });

    it("restores a stored false value over an existing true value", () => {
        useLinkStore.setState({showArchived: true});
        localStorage.setItem(SHOW_ARCHIVED_STORAGE_KEY, "false");

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(false);
    });

    it("leaves the default when nothing is stored", () => {
        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(false);
    });

    it("logs and keeps the default when localStorage cannot be read", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new Error("denied"); });

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(false);
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("updates the search query", () => {
        useLinkStore.getState().setSearchQuery("docs");

        expect(useLinkStore.getState().searchQuery).toBe("docs");
    });
});

describe("link store archiving", () => {
    afterEach(() => {
        useLinkStore.setState(initialState, true);
    });

    function sentBody(): Record<string, unknown> {
        const body = vi.mocked(fetchWithAuth).mock.calls[0][1]?.body;
        return JSON.parse(String(body));
    }

    it("sends the full link with inverted activity and refetches the list", async () => {
        const link = createLinkItem({id: "a", tagIds: ["t1"]});
        useLinkStore.setState({links: [link]});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));
        mockLinksPage([createShortLink({id: "a", isActive: false})]);

        await useLinkStore.getState().setLinkArchived("a", true);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0]).toBe(API_ENDPOINTS.SHORTLINKS);
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.method).toBe("PUT");
        expect(sentBody()).toEqual({
            id: "a", title: link.title, longUrl: link.longUrl, key: link.key, isActive: false, tagIds: ["t1"],
        });
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        expect(useLinkStore.getState().links[0].isActive).toBe(false);
    });

    it("reactivates a link when unarchiving", async () => {
        useLinkStore.setState({links: [createLinkItem({id: "a", isActive: false})]});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));
        mockLinksPage([]);

        await useLinkStore.getState().setLinkArchived("a", false);

        expect(sentBody().isActive).toBe(true);
    });

    it("sends an empty tag list for a link without tags", async () => {
        useLinkStore.setState({links: [createLinkItem({id: "a", tagIds: undefined})]});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null));
        mockLinksPage([]);

        await useLinkStore.getState().setLinkArchived("a", true);

        expect(sentBody().tagIds).toEqual([]);
    });

    it("reports an error without calling the API when the link is unknown", async () => {
        await useLinkStore.getState().setLinkArchived("missing", true);

        expect(useLinkStore.getState().error).toBe("Failed to update archive status: link not found");
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("reports an error without calling the API when the link has no key", async () => {
        useLinkStore.setState({links: [createLinkItem({id: "a", key: undefined})]});

        await useLinkStore.getState().setLinkArchived("a", true);

        expect(useLinkStore.getState().error).toBe("Failed to update archive status: missing key");
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("exposes the HTTP status and does not refetch when the update fails", async () => {
        useLinkStore.setState({links: [createLinkItem({id: "a"})]});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 409}));

        await useLinkStore.getState().setLinkArchived("a", true);

        expect(useLinkStore.getState().error).toBe("Failed to update archive status: 409");
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("exposes the error message when the update request rejects", async () => {
        useLinkStore.setState({links: [createLinkItem({id: "a"})]});
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));

        await useLinkStore.getState().setLinkArchived("a", true);

        expect(useLinkStore.getState().error).toBe("offline");
        expect(logger.error).toHaveBeenCalledOnce();
    });
});
