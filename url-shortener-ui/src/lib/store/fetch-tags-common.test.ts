import {describe, expect, it, vi} from "vitest";
import {API_ENDPOINTS} from "@/lib/constants";
import {fetchTagsResponse} from "@/lib/store/fetch-tags-common";
import {createTag} from "@/test/tag-utils";

function respondWith(response: Response): ReturnType<typeof vi.fn<(url: string) => Promise<Response>>> {
    return vi.fn<(url: string) => Promise<Response>>().mockResolvedValue(response);
}

describe("fetchTagsResponse", () => {
    it("requests the tags endpoint with the given query", async () => {
        const fetchMock = respondWith(Response.json([]));

        await fetchTagsResponse(new URLSearchParams({size: "5"}), vi.fn(), fetchMock);

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${API_ENDPOINTS.TAGS}?size=5`);
    });

    it("stores tags from a paged response", async () => {
        const tags = [createTag()];
        const set = vi.fn();

        await fetchTagsResponse(new URLSearchParams(), set, respondWith(Response.json({content: tags})));

        expect(set).toHaveBeenCalledExactlyOnceWith({tags});
    });

    it("stores tags from a plain array response", async () => {
        const tags = [createTag(), createTag({id: "tag-2", name: "Sales"})];
        const set = vi.fn();

        await fetchTagsResponse(new URLSearchParams(), set, respondWith(Response.json(tags)));

        expect(set).toHaveBeenCalledExactlyOnceWith({tags});
    });

    it("stores an empty list when the page has no tags", async () => {
        const set = vi.fn();

        await fetchTagsResponse(new URLSearchParams(), set, respondWith(Response.json({content: []})));

        expect(set).toHaveBeenCalledExactlyOnceWith({tags: []});
    });

    it("reports the HTTP status when the request fails", async () => {
        const set = vi.fn();

        await fetchTagsResponse(new URLSearchParams(), set, respondWith(new Response(null, {status: 503})));

        expect(set).toHaveBeenCalledExactlyOnceWith({error: "Failed to fetch tags: 503"});
    });

    it("loads every page and stores all the tags together", async () => {
        const first = [createTag({id: "tag-1", name: "One"})];
        const second = [createTag({id: "tag-2", name: "Two"})];
        const third = [createTag({id: "tag-21", name: "Twenty-one"})];
        const fetchMock = vi.fn<(url: string) => Promise<Response>>()
            .mockResolvedValueOnce(Response.json({content: first, page: {totalPages: 3, number: 0, size: 1, totalElements: 3}}))
            .mockResolvedValueOnce(Response.json({content: second, page: {totalPages: 3, number: 1, size: 1, totalElements: 3}}))
            .mockResolvedValueOnce(Response.json({content: third, totalPages: 3, number: 2, size: 1, totalElements: 3}));
        const set = vi.fn();

        await fetchTagsResponse(new URLSearchParams({size: "1"}), set, fetchMock);

        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
            `${API_ENDPOINTS.TAGS}?size=1`, `${API_ENDPOINTS.TAGS}?size=1&page=1`, `${API_ENDPOINTS.TAGS}?size=1&page=2`,
        ]);
        expect(set).toHaveBeenCalledExactlyOnceWith({tags: [...first, ...second, ...third]});
    });

    it("stores nothing but the error when a later page fails", async () => {
        const fetchMock = vi.fn<(url: string) => Promise<Response>>()
            .mockResolvedValueOnce(Response.json({content: [createTag()], totalPages: 2}))
            .mockResolvedValueOnce(new Response(null, {status: 500}));
        const set = vi.fn();

        await fetchTagsResponse(new URLSearchParams(), set, fetchMock);

        expect(set).toHaveBeenCalledExactlyOnceWith({error: "Failed to fetch tags: 500"});
    });

    it("stops after a bounded number of pages when the backend keeps reporting more", async () => {
        const fetchMock = vi.fn<(url: string) => Promise<Response>>()
            .mockImplementation(async () => Response.json({content: [], totalPages: Number.MAX_SAFE_INTEGER}));

        await fetchTagsResponse(new URLSearchParams(), vi.fn(), fetchMock);

        expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(100);
    });

    it("lets a network failure propagate to the caller", async () => {
        const fetchMock = vi.fn<(url: string) => Promise<Response>>().mockRejectedValue(new Error("offline"));

        await expect(fetchTagsResponse(new URLSearchParams(), vi.fn(), fetchMock)).rejects.toThrow("offline");
    });
});
