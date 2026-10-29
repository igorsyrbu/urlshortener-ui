import {afterEach, describe, expect, it, vi} from "vitest";
import {invalidateServerState, prefetchServerState, setActiveQueryClient} from "@/lib/query/active-query-client";
import {queryKeys} from "@/lib/query/query-keys";
import {createTestQueryClient} from "@/test/query-utils";

describe("invalidateServerState", () => {
    afterEach(() => {
        setActiveQueryClient(null);
    });

    it("invalidates the matching queries of the active client", () => {
        const queryClient = createTestQueryClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        setActiveQueryClient(queryClient);

        invalidateServerState(queryKeys.links.all);

        expect(invalidate).toHaveBeenCalledExactlyOnceWith({queryKey: queryKeys.links.all});
    });

    it("does nothing while no dashboard is mounted", () => {
        expect(() => invalidateServerState(queryKeys.links.all)).not.toThrow();
    });

    it("prefetches a query on the active client", () => {
        const queryClient = createTestQueryClient();
        const prefetch = vi.spyOn(queryClient, "prefetchQuery").mockResolvedValue();
        setActiveQueryClient(queryClient);
        const options = {queryKey: queryKeys.tags.all, queryFn: async () => []};

        prefetchServerState(options);

        expect(prefetch).toHaveBeenCalledExactlyOnceWith(options);
    });

    it("prefetches nothing while no dashboard is mounted", () => {
        expect(() => prefetchServerState({queryKey: queryKeys.tags.all, queryFn: async () => []})).not.toThrow();
    });
});
