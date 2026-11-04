import {act, render} from "@testing-library/react";
import {useQueryClient, type QueryClient} from "@tanstack/react-query";
import {afterEach, describe, expect, it, vi} from "vitest";
import {refreshServerStateAfter} from "@/lib/query/active-query-client";
import {queryKeys} from "@/lib/query/query-keys";
import {useAuthStore} from "@/lib/store/auth";
import {QueryProvider} from "@/providers/query-provider";

const CACHED_LINKS = {content: [{id: "link-1"}]};

function renderProviderAndGetClient(): QueryClient {
    const captured: {client: QueryClient | null} = {client: null};
    function CaptureClient(): null {
        captured.client = useQueryClient();
        return null;
    }
    render(<QueryProvider><CaptureClient/></QueryProvider>);
    if (!captured.client) throw new Error("QueryProvider did not provide a client");
    return captured.client;
}

describe("QueryProvider", () => {
    afterEach(() => {
        useAuthStore.setState({accessToken: null});
    });

    it("forgets every cached response when the user signs out", () => {
        useAuthStore.setState({accessToken: "token-1"});
        const queryClient = renderProviderAndGetClient();
        queryClient.setQueryData(queryKeys.links.all, CACHED_LINKS);

        act(() => { useAuthStore.getState().logout(); });

        expect(queryClient.getQueryData(queryKeys.links.all)).toBeUndefined();
    });

    it("lets stores outside React refresh its queries while it is mounted", () => {
        const queryClient = renderProviderAndGetClient();
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");

        refreshServerStateAfter("linkArchived");

        expect(invalidate).toHaveBeenCalledExactlyOnceWith({queryKey: queryKeys.links.all});
    });

    it("keeps the cache when the access token is refreshed", () => {
        useAuthStore.setState({accessToken: "token-1"});
        const queryClient = renderProviderAndGetClient();
        queryClient.setQueryData(queryKeys.links.all, CACHED_LINKS);

        act(() => { useAuthStore.getState().setAccessToken("token-2"); });

        expect(queryClient.getQueryData(queryKeys.links.all)).toEqual(CACHED_LINKS);
    });
});
