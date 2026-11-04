import {describe, expect, it} from "vitest";
import {refreshAfter} from "@/lib/query/invalidation";
import {queryKeys} from "@/lib/query/query-keys";
import {allTagsQueryOptions, tagsWithCountQueryOptions} from "@/lib/query/tag-queries";
import {createTag} from "@/test/tag-utils";
import {createTestQueryClient} from "@/test/query-utils";

const TAGS = [createTag()];

function isStale(queryClient: ReturnType<typeof createTestQueryClient>, queryKey: readonly unknown[]): boolean | undefined {
    return queryClient.getQueryState(queryKey)?.isInvalidated;
}

describe("refreshAfter", () => {
    it("marks the tags page's lists stale for every search after a link is deleted, but not the badge list", async () => {
        const queryClient = createTestQueryClient();
        queryClient.setQueryData(allTagsQueryOptions.queryKey, TAGS);
        queryClient.setQueryData(tagsWithCountQueryOptions("").queryKey, TAGS);
        queryClient.setQueryData(tagsWithCountQueryOptions("mark").queryKey, TAGS);

        await refreshAfter(queryClient, "linkDeleted");

        expect(isStale(queryClient, tagsWithCountQueryOptions("").queryKey)).toBe(true);
        expect(isStale(queryClient, tagsWithCountQueryOptions("mark").queryKey)).toBe(true);
        expect(isStale(queryClient, allTagsQueryOptions.queryKey)).toBe(false);
    });

    it("marks every links and tags query stale after an import", async () => {
        const queryClient = createTestQueryClient();
        const linksKey = queryKeys.links.page({page: 0, showArchived: false, search: ""});
        queryClient.setQueryData(linksKey, {links: [], page: 0, totalElements: 0, totalPages: 0});
        queryClient.setQueryData(allTagsQueryOptions.queryKey, TAGS);

        await refreshAfter(queryClient, "importCompleted");

        expect(isStale(queryClient, linksKey)).toBe(true);
        expect(isStale(queryClient, allTagsQueryOptions.queryKey)).toBe(true);
    });
});
