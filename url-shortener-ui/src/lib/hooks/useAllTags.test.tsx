import type {ReactNode} from "react";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClientProvider, type QueryClient} from "@tanstack/react-query";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useAllTags} from "@/lib/hooks/useAllTags";
import {allTagsQueryOptions} from "@/lib/query/tag-queries";
import {fetchAllTags} from "@/lib/tags-api";
import {createTag} from "@/test/tag-utils";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/tags-api", () => ({fetchAllTags: vi.fn()}));

const TAGS = [createTag({id: "t1"}), createTag({id: "t2", name: "Learning"})];

let queryClient: QueryClient;

function renderAllTags() {
    const wrapper = ({children}: {children: ReactNode}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useAllTags(), {wrapper}).result;
}

describe("useAllTags", () => {
    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.mocked(fetchAllTags).mockResolvedValue(TAGS);
    });

    it("loads every tag without link counts", async () => {
        const result = renderAllTags();

        expect(result.current).toEqual({tags: [], isLoading: true});
        await waitFor(() => expect(result.current).toEqual({tags: TAGS, isLoading: false}));
        expect(fetchAllTags).toHaveBeenCalledWith({withLinksCount: false, search: ""}, expect.any(AbortSignal));
    });

    it("sends one request for every card and picker that asks at the same time", async () => {
        const results = [renderAllTags(), renderAllTags(), renderAllTags()];

        await waitFor(() => expect(results.every((result) => result.current.tags === TAGS)).toBe(true));
        expect(fetchAllTags).toHaveBeenCalledOnce();
    });

    it("uses tags already loaded without asking again", () => {
        queryClient.setQueryData(allTagsQueryOptions.queryKey, TAGS);

        const result = renderAllTags();

        expect(result.current).toEqual({tags: TAGS, isLoading: false});
        expect(fetchAllTags).not.toHaveBeenCalled();
    });
});
