import type {AnalyticsBreakdown, AnalyticsRange} from "@/lib/analytics-api";
import type {LinksPageParams} from "@/lib/links-api";
import type {TagListParams} from "@/lib/tags-api";

/**
 * Root of every query key, one per resource, so a whole resource can be invalidated at once
 * (`queryClient.invalidateQueries({queryKey: queryKeys.links.all})`). Each resource adds its own key builders.
 */
export const queryKeys = {
    links: {
        all: ["links"] as const,
        page: (params: LinksPageParams) => ["links", "page", params] as const,
    },
    tags: {
        all: ["tags"] as const,
        list: (params: TagListParams) => ["tags", "list", params] as const,
        /** Every list with link counts, whatever its search: query keys match objects by the fields they name. */
        withLinkCounts: ["tags", "list", {withLinksCount: true}] as const,
    },
    analytics: {
        all: ["analytics"] as const,
        overview: (range: AnalyticsRange) => ["analytics", "overview", range] as const,
        referrers: (range: AnalyticsRange) => ["analytics", "referrers", range] as const,
        topLinks: (range: AnalyticsRange) => ["analytics", "topLinks", range] as const,
        breakdown: (breakdown: AnalyticsBreakdown, range: AnalyticsRange) => ["analytics", "breakdown", breakdown, range] as const,
    },
    user: {all: ["user"] as const},
    preferences: {all: ["preferences"] as const},
    sessions: {all: ["sessions"] as const},
    billing: {
        all: ["billing"] as const,
        subscription: ["billing", "subscription"] as const,
    },
} as const;
