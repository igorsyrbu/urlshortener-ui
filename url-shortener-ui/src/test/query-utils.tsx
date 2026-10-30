import type {ReactNode} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render, type RenderOptions, type RenderResult} from "@testing-library/react";

/** No retries (a failure shows at once) and no garbage collection (cached data stays inspectable). */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {retry: false, gcTime: Infinity},
            mutations: {retry: false},
        },
    });
}

/** Renders inside a `QueryClientProvider`; `rerender` keeps the provider, as it is passed as the render `wrapper`. */
export function renderWithQuery(ui: ReactNode, queryClient: QueryClient = createTestQueryClient()): RenderResult & {queryClient: QueryClient} {
    const options: Omit<RenderOptions, "queries"> = {
        wrapper: ({children}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    };
    return {...render(ui, options), queryClient};
}
