import type {ReactElement} from "react";
import type {Mock} from "vitest";
import type {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import type {BarLabelProps} from "@/components/analytics/HorizontalBarChart";
import type {AnalyticsGroupedClick} from "@/lib/analytics-api";

interface MockBarChartItem {
    name: string;
    clicks: number;
}

interface MockHorizontalBarChartProps {
    data: MockBarChartItem[];
    totalClicks: number;
    color: string;
    renderLabel: (props: BarLabelProps) => ReactElement;
}

const MOCK_BAR_HEIGHT = 40;

export function MockHorizontalBarChart({data, totalClicks, color, renderLabel}: MockHorizontalBarChartProps): ReactElement {
    return (
        <svg data-testid="bar-chart" data-color={color} data-total-clicks={totalClicks}>
            {data.map((item) => (
                <g key={item.name} data-testid="bar-row" data-clicks={item.clicks}>
                    {renderLabel({x: 0, y: 0, width: 0, height: MOCK_BAR_HEIGHT, value: item.name})}
                </g>
            ))}
        </svg>
    );
}

export function createGroupedClick(overrides: Partial<AnalyticsGroupedClick> = {}): AnalyticsGroupedClick {
    return {label: "Desktop", clicks: 10, ...overrides};
}

export type AnalyticsRoute =
    "total" | "previous" | "date" | "referrer" | "top_link" | "country" | "continent" | "device" | "os" | "byIds";
export type AnalyticsRoutes = Partial<Record<AnalyticsRoute, Response | Error | Promise<Response>>>;

const EMPTY_ANALYTICS_ROUTES: Record<AnalyticsRoute, () => Response> = {
    total: () => Response.json(0),
    previous: () => Response.json(0),
    date: () => Response.json([]),
    referrer: () => Response.json([]),
    top_link: () => Response.json([]),
    country: () => Response.json([]),
    continent: () => Response.json([]),
    device: () => Response.json([]),
    os: () => Response.json([]),
    byIds: () => Response.json([]),
};

function isAnalyticsRoute(value: string): value is AnalyticsRoute {
    return value in EMPTY_ANALYTICS_ROUTES;
}

/** Which request a URL is. A total for a custom range (`start`/`end`, no `groupBy`) counts as `previous`. */
function analyticsRouteOf(url: string): AnalyticsRoute {
    if (url.startsWith(API_ENDPOINTS.SHORTLINKS_BY_IDS)) return "byIds";
    const params = new URLSearchParams(url.split("?")[1]);
    const groupBy = params.get("groupBy");
    if (groupBy && isAnalyticsRoute(groupBy)) return groupBy;
    return params.has("period") ? "total" : "previous";
}

/**
 * Answers each analytics request from `routes` (an `Error` rejects, a promise answers when it settles), anything else
 * with an empty result. Pass the mocked `fetchWithAuth`.
 */
export function mockAnalyticsApi(fetchMock: Mock<typeof fetchWithAuth>, routes: AnalyticsRoutes = {}): void {
    fetchMock.mockImplementation(async (url) => {
        const route = routes[analyticsRouteOf(url)];
        if (route === undefined) return EMPTY_ANALYTICS_ROUTES[analyticsRouteOf(url)]();
        if (route instanceof Error) throw route;
        return route instanceof Response ? route.clone() : (await route).clone();
    });
}
