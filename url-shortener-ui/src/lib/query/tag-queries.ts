import {queryOptions} from "@tanstack/react-query";
import {fetchAllTags, type TagListParams} from "@/lib/tags-api";
import {queryKeys} from "@/lib/query/query-keys";

/** Tags change only through this app's own mutations, which edit the cache, so a long freshness spares requests. */
const ALL_TAGS_STALE_TIME_MS = 5 * 60_000;

const ALL_TAGS_PARAMS: TagListParams = {withLinksCount: false, search: ""};

/** Every tag, without link counts: link card badges, the tag picker and the create-link form share this one query. */
export const allTagsQueryOptions = queryOptions({
    queryKey: queryKeys.tags.list(ALL_TAGS_PARAMS),
    queryFn: ({signal}) => fetchAllTags(ALL_TAGS_PARAMS, signal),
    staleTime: ALL_TAGS_STALE_TIME_MS,
});

/** The tags page: every tag matching the search, with link counts. */
export function tagsWithCountQueryOptions(search: string) {
    const params: TagListParams = {withLinksCount: true, search};
    return queryOptions({
        queryKey: queryKeys.tags.list(params),
        queryFn: ({signal}) => fetchAllTags(params, signal),
    });
}
