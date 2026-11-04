import {afterEach, describe, expect, it, vi} from "vitest";
import {prefetchServerState, refreshServerStateAfter, setActiveQueryClient} from "@/lib/query/active-query-client";
import {queryKeys} from "@/lib/query/query-keys";
import {createTestQueryClient} from "@/test/query-utils";

describe("server state outside React", () => {
    afterEach(() => {
        setActiveQueryClient(null);
    });

    it("refreshes what a change makes stale on the active client", () => {
        const queryClient = createTestQueryClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        setActiveQueryClient(queryClient);

        refreshServerStateAfter("importCompleted");

        expect(invalidate.mock.calls).toEqual([[{queryKey: queryKeys.links.all}], [{queryKey: queryKeys.tags.all}]]);
    });

    it("does nothing while no dashboard is mounted", () => {
        expect(() => refreshServerStateAfter("importCompleted")).not.toThrow();
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
