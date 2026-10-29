"use client";

import {useEffect, useState, type ReactNode} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import {createQueryClient} from "@/lib/query/query-client";
import {setActiveQueryClient} from "@/lib/query/active-query-client";
import {useAuthStore} from "@/lib/store/auth";

interface QueryProviderProps {
    children: ReactNode;
}

/** The server-state cache of the signed-in dashboard; it lives as long as the dashboard layout. */
export function QueryProvider({children}: QueryProviderProps) {
    const [queryClient] = useState(createQueryClient);

    // One user's cached data must never be shown to the next one who signs in on this tab.
    useEffect(() => useAuthStore.subscribe((state, previousState) => {
        if (previousState.accessToken !== null && state.accessToken === null) queryClient.clear();
    }), [queryClient]);

    useEffect(() => {
        setActiveQueryClient(queryClient);
        return () => setActiveQueryClient(null);
    }, [queryClient]);

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
