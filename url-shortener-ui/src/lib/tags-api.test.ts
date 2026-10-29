import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {ApiError} from "@/lib/api-request";
import {API_ENDPOINTS} from "@/lib/constants";
import {HTTP_CONFLICT, HTTP_INTERNAL_SERVER_ERROR, HTTP_NO_CONTENT, HTTP_NOT_FOUND} from "@/lib/http-status";
import {createTagRequest, deleteTagRequest, fetchAllTags, TAGS_PAGE_SIZE, updateTagRequest, type TagListParams} from "@/lib/tags-api";
import {createPage} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const ALL_TAGS: TagListParams = {withLinksCount: false, search: ""};
const MAX_TAG_PAGES = 100;

function requestedParams(callIndex = 0): URLSearchParams {
    const [url] = vi.mocked(fetchWithAuth).mock.calls[callIndex];
    return new URLSearchParams(url.split("?")[1]);
}

function mockTagsPage(tags: ReturnType<typeof createTag>[], totalPages = 1): void {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createPage(tags, {page: {totalPages, totalElements: tags.length, size: TAGS_PAGE_SIZE, number: 0}})));
}

describe("fetchAllTags", () => {
    it("requests the tags endpoint with the page size, the links count flag and no search", async () => {
        mockTagsPage([]);

        await fetchAllTags(ALL_TAGS);

        expect(vi.mocked(fetchWithAuth).mock.calls[0][0].startsWith(`${API_ENDPOINTS.TAGS}?`)).toBe(true);
        expect(Object.fromEntries(requestedParams())).toEqual({withLinksCount: "false", size: String(TAGS_PAGE_SIZE)});
    });

    it("sends the search and the links count flag of the tags page", async () => {
        mockTagsPage([]);

        await fetchAllTags({withLinksCount: true, search: "wor"});

        expect(requestedParams().get("withLinksCount")).toBe("true");
        expect(requestedParams().get("search")).toBe("wor");
    });

    it("reads tags from a paged response and from a plain array", async () => {
        const tag = createTag({id: "t1"});
        mockTagsPage([tag]);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json([tag]));

        await expect(fetchAllTags(ALL_TAGS)).resolves.toEqual([tag]);
        await expect(fetchAllTags(ALL_TAGS)).resolves.toEqual([tag]);
    });

    it("loads every page, so a link's 101st tag still has a badge", async () => {
        mockTagsPage([createTag({id: "t1"})], 2);
        mockTagsPage([createTag({id: "t2"})], 2);

        const tags = await fetchAllTags(ALL_TAGS);

        expect(tags.map((tag) => tag.id)).toEqual(["t1", "t2"]);
        expect(requestedParams(0).has("page")).toBe(false);
        expect(requestedParams(1).get("page")).toBe("1");
    });

    it("rejects with the status of a failed page, returning none of the tags", async () => {
        mockTagsPage([createTag()], 2);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

        const error = await fetchAllTags(ALL_TAGS).catch((reason: unknown) => reason);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({status: HTTP_INTERNAL_SERVER_ERROR});
    });

    it("stops after a bounded number of pages when the backend keeps reporting more", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json(createPage([createTag()], {page: {totalPages: 10_000, totalElements: 10_000, size: 1, number: 0}})));

        await fetchAllTags(ALL_TAGS);

        expect(fetchWithAuth).toHaveBeenCalledTimes(MAX_TAG_PAGES);
    });

    it("lets a network failure propagate", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new TypeError("Failed to fetch"));

        await expect(fetchAllTags(ALL_TAGS)).rejects.toThrow("Failed to fetch");
    });
});

describe("tag mutation requests", () => {
    it("creates a tag with a trimmed name and resolves with the saved tag", async () => {
        const saved = createTag({id: "t9", name: "Work", color: "blue"});
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(saved));

        await expect(createTagRequest("  Work ", "blue")).resolves.toEqual(saved);

        expect(vi.mocked(fetchWithAuth).mock.calls[0]).toEqual([API_ENDPOINTS.TAGS, {method: "POST", body: JSON.stringify({name: "Work", color: "blue"})}]);
    });

    it("updates a tag by id", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createTag({id: "t1"})));

        await updateTagRequest("t1", " Home ", "green");

        expect(vi.mocked(fetchWithAuth).mock.calls[0]).toEqual([API_ENDPOINTS.TAGS, {method: "PUT", body: JSON.stringify({id: "t1", name: "Home", color: "green"})}]);
    });

    it("deletes a tag by id without reading a body", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_NO_CONTENT}));

        await expect(deleteTagRequest("t1")).resolves.toBeUndefined();

        expect(vi.mocked(fetchWithAuth).mock.calls[0]).toEqual([`${API_ENDPOINTS.TAGS}/t1`, {method: "DELETE"}]);
    });

    it.each([
        ["create", () => createTagRequest("Work", "blue"), HTTP_CONFLICT],
        ["delete", () => deleteTagRequest("t1"), HTTP_NOT_FOUND],
    ])("rejects a refused %s with the server's reason", async (_name, request, status) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "Tag already exists."}, {status}));

        await expect(request()).rejects.toMatchObject({status, message: "Tag already exists."});
    });
});
