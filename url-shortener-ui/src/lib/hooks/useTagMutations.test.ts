import {createElement, type ReactNode} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {ApiError} from "@/lib/api-request";
import {API_ENDPOINTS} from "@/lib/constants";
import {ERROR_COPY} from "@/lib/errors";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {allTagsQueryOptions, tagsWithCountQueryOptions} from "@/lib/query/tag-queries";
import type {TagItem} from "@/lib/types";
import {createTestQueryClient} from "@/test/query-utils";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const countKey = tagsWithCountQueryOptions("").queryKey;
const searchedCountKey = tagsWithCountQueryOptions("mark").queryKey;

function seedAllCachedLists(queryClient: QueryClient, tags: TagItem[]): void {
    queryClient.setQueryData(allTagsQueryOptions.queryKey, tags);
    queryClient.setQueryData(countKey, tags);
    queryClient.setQueryData(searchedCountKey, tags);
}

function expectAllCachedLists(queryClient: QueryClient, tags: TagItem[]): void {
    expect(queryClient.getQueryData(allTagsQueryOptions.queryKey)).toEqual(tags);
    expect(queryClient.getQueryData(countKey)).toEqual(tags);
    expect(queryClient.getQueryData(searchedCountKey)).toEqual(tags);
}

function createQueryWrapper(queryClient: QueryClient) {
    return function QueryWrapper({children}: {children: ReactNode}) {
        return createElement(QueryClientProvider, {client: queryClient}, children);
    };
}

function renderMutations(tags: TagItem[] = []) {
    const queryClient = createTestQueryClient();
    seedAllCachedLists(queryClient, tags);
    const {result} = renderHook(() => useTagMutations(), {wrapper: createQueryWrapper(queryClient)});
    return {mutations: result.current, queryClient};
}

function sentRequest(): {url: string; method: string | undefined; body: unknown} {
    const [url, options] = vi.mocked(fetchWithAuth).mock.calls[0];
    return {url, method: options?.method, body: options?.body ? JSON.parse(String(options.body)) : undefined};
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => {
            throw new Error("expected the promise to reject");
        },
        (error: unknown) => error,
    );
}

describe("useTagMutations", () => {
    describe("createTag", () => {
        it("posts the trimmed name with the color", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createTag()));
            const {mutations} = renderMutations();

            await mutations.createTag("  Marketing  ", "blue");

            expect(sentRequest()).toEqual({url: API_ENDPOINTS.TAGS, method: "POST", body: {name: "Marketing", color: "blue"}});
        });

        it("returns the created tag and prepends it to every cached tag list", async () => {
            const existing = createTag({id: "tag-0", name: "Existing"});
            const created = createTag({id: "tag-1"});
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(created));
            const {mutations, queryClient} = renderMutations([existing]);

            const returned = await mutations.createTag("Marketing", "blue");

            expect(returned).toEqual(created);
            expectAllCachedLists(queryClient, [created, existing]);
        });

        it("does not create a cache entry for a list that was never loaded", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createTag()));
            const queryClient = createTestQueryClient();
            const {result} = renderHook(() => useTagMutations(), {wrapper: createQueryWrapper(queryClient)});

            await result.current.createTag("Marketing", "blue");

            expect(queryClient.getQueryData(allTagsQueryOptions.queryKey)).toBeUndefined();
        });

        it("rejects with the response body as the message and leaves the cache untouched when the server rejects the tag", async () => {
            const existing = createTag();
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("Tag already exists", {status: 409}));
            const {mutations, queryClient} = renderMutations([existing]);

            const error = await rejectionOf(mutations.createTag("Marketing", "blue"));

            expect(error).toBeInstanceOf(ApiError);
            expect(error).toHaveProperty("message", "Tag already exists");
            expectAllCachedLists(queryClient, [existing]);
        });

        it("reads the message from a JSON error body", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({error: "Invalid tag data or duplicate name"}, {status: 400}));
            const {mutations} = renderMutations();

            await expect(mutations.createTag("Marketing", "blue")).rejects.toThrow(/^Invalid tag data or duplicate name$/);
        });

        it("describes the failure in plain words when the error body is empty", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
            const {mutations} = renderMutations();

            await expect(mutations.createTag("Marketing", "blue")).rejects.toThrow(ERROR_COPY.SERVER);
        });

        it("rethrows a network failure without touching the cache", async () => {
            const existing = createTag();
            vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));
            const {mutations, queryClient} = renderMutations([existing]);

            await expect(mutations.createTag("Marketing", "blue")).rejects.toThrow("offline");

            expectAllCachedLists(queryClient, [existing]);
        });
    });

    describe("updateTag", () => {
        it("puts the id with the trimmed name and color", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createTag()));
            const {mutations} = renderMutations();

            await mutations.updateTag("tag-1", " Sales ", "green");

            expect(sentRequest()).toEqual({url: API_ENDPOINTS.TAGS, method: "PUT", body: {id: "tag-1", name: "Sales", color: "green"}});
        });

        it("replaces only the updated tag in every cached list and keeps its other fields", async () => {
            const untouched = createTag({id: "tag-2", name: "Other"});
            const original = createTag({id: "tag-1", linkCount: 4});
            const updated = createTag({id: "tag-1", name: "Sales", color: "green"});
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(updated));
            const {mutations, queryClient} = renderMutations([original, untouched]);

            await mutations.updateTag("tag-1", "Sales", "green");

            expectAllCachedLists(queryClient, [{...updated, linkCount: 4}, untouched]);
        });

        it("rejects with the server message and keeps the cache when the update fails", async () => {
            const original = createTag();
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("Name taken", {status: 409}));
            const {mutations, queryClient} = renderMutations([original]);

            await expect(mutations.updateTag("tag-1", "Sales", "green")).rejects.toThrow("Name taken");

            expectAllCachedLists(queryClient, [original]);
        });

        it("falls back to the HTTP status when the error body is empty", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 404}));
            const {mutations} = renderMutations();

            await expect(mutations.updateTag("tag-1", "Sales", "green")).rejects.toThrow(ERROR_COPY.NOT_FOUND);
        });
    });

    describe("deleteTag", () => {
        it("sends a DELETE for the tag id", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));
            const {mutations} = renderMutations();

            await mutations.deleteTag("tag-1");

            expect(sentRequest()).toEqual({url: `${API_ENDPOINTS.TAGS}/tag-1`, method: "DELETE", body: undefined});
        });

        it("removes the tag from every cached list", async () => {
            const kept = createTag({id: "tag-2", name: "Kept"});
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));
            const {mutations, queryClient} = renderMutations([createTag({id: "tag-1"}), kept]);

            await mutations.deleteTag("tag-1");

            expectAllCachedLists(queryClient, [kept]);
        });

        it("keeps the tag and explains the failure when deletion fails", async () => {
            const tag = createTag({id: "tag-1"});
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 403}));
            const {mutations, queryClient} = renderMutations([tag]);

            await expect(mutations.deleteTag("tag-1")).rejects.toThrow(ERROR_COPY.FORBIDDEN);

            expectAllCachedLists(queryClient, [tag]);
        });
    });
});
