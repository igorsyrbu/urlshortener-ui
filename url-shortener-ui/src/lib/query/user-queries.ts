import {queryOptions} from "@tanstack/react-query";
import {queryKeys} from "@/lib/query/query-keys";
import {fetchCurrentUser} from "@/lib/user-api";

/**
 * The signed-in user. It changes only through this app (the profile name), which refreshes it, so it never goes
 * stale on its own. No automatic retry: the dashboard bootstrap shows "Try again" for an unreachable server.
 */
export const currentUserQueryOptions = queryOptions({
    queryKey: queryKeys.user.all,
    queryFn: ({signal}) => fetchCurrentUser(signal),
    staleTime: Infinity,
    retry: false,
});
