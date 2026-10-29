"use client";

import {useQuery} from "@tanstack/react-query";
import {allTagsQueryOptions} from "@/lib/query/tag-queries";
import type {TagItem} from "@/lib/types";

const NO_TAGS: TagItem[] = [];

interface AllTags {
    tags: TagItem[];
    /** True until the first load has answered; later refreshes keep the current tags on screen. */
    isLoading: boolean;
}

/** Every tag (no link counts), loaded once and shared by every caller; empty until it arrives. */
export function useAllTags(): AllTags {
    const {data, isPending} = useQuery(allTagsQueryOptions);
    return {tags: data ?? NO_TAGS, isLoading: isPending};
}
