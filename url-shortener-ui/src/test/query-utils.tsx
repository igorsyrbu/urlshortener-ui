import type {ReactNode} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render, type RenderResult} from "@testing-library/react";

/** No retries (a failure shows at once) and no garbage collection (cached data stays inspectable). */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {retry: false, gcTime: Infinity},
            mutations: {retry: false},
        },
    });
}

export function renderWithQuery(ui: ReactNode, queryClient: QueryClient = createTestQueryClient()): RenderResult & {queryClient: QueryClient} {
    return {...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>), queryClient};
}
