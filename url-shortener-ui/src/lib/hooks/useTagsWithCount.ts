"use client";

import {keepPreviousData, useQuery, type UseQueryResult} from "@tanstack/react-query";
import {tagsWithCountQueryOptions} from "@/lib/query/tag-queries";
import type {TagItem} from "@/lib/types";

/** The tags page's list for the committed search; the previous results stay on screen while a new search loads. */
export function useTagsWithCount(search: string): UseQueryResult<TagItem[]> {
    return useQuery({...tagsWithCountQueryOptions(search), placeholderData: keepPreviousData});
}
