import type {LinksPageParams} from "@/lib/links-api";

/**
 * Root of every query key, one per resource, so a whole resource can be invalidated at once
 * (`queryClient.invalidateQueries({queryKey: queryKeys.links.all})`). Each resource adds its own key builders.
 */
export const queryKeys = {
    links: {
        all: ["links"] as const,
        page: (params: LinksPageParams) => ["links", "page", params] as const,
    },
    tags: {all: ["tags"] as const},
    analytics: {all: ["analytics"] as const},
    user: {all: ["user"] as const},
    preferences: {all: ["preferences"] as const},
    sessions: {all: ["sessions"] as const},
    billing: {all: ["billing"] as const},
} as const;
