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

    it("lets a network failure propagate to the caller", async () => {
        const fetchMock = vi.fn<(url: string) => Promise<Response>>().mockRejectedValue(new Error("offline"));

        await expect(fetchTagsResponse(new URLSearchParams(), vi.fn(), fetchMock)).rejects.toThrow("offline");
    });
});
