"use client";

import {useEffect} from "react";
import {keepPreviousData, useQuery, useQueryClient, type UseQueryResult} from "@tanstack/react-query";
import {DEFAULT_PAGE_SIZE} from "@/lib/constants";
import {fetchLinksPage, type LinksPage, type LinksPageParams} from "@/lib/links-api";
import {queryKeys} from "@/lib/query/query-keys";

/**
 * One page of the links list. While another page, filter or search loads, the previous page stays on screen
 * (`isPlaceholderData`), and once a page has loaded the next one is fetched ahead so "Next" shows it at once.
 */
export function useLinksPage(params: LinksPageParams, isEnabled: boolean): UseQueryResult<LinksPage> {
    const queryClient = useQueryClient();
    const {page, showArchived, search} = params;
    const query = useQuery({
        queryKey: queryKeys.links.page(params),
        queryFn: ({signal}) => fetchLinksPage(params, signal),
        placeholderData: keepPreviousData,
        enabled: isEnabled,
    });

    const totalElements = query.isPlaceholderData ? undefined : query.data?.totalElements;
    const hasNextPage = totalElements !== undefined && (page + 1) * DEFAULT_PAGE_SIZE < totalElements;

    useEffect(() => {
        if (!hasNextPage) return;
        const nextPageParams = {page: page + 1, showArchived, search};
        void queryClient.prefetchQuery({
            queryKey: queryKeys.links.page(nextPageParams),
            queryFn: ({signal}) => fetchLinksPage(nextPageParams, signal),
        });
    }, [hasNextPage, page, showArchived, search, queryClient]);

    return query;
}
