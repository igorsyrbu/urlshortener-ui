import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import AnalyticsPage from "@/app/(dashboard)/analytics/page";
import {useAnalyticsStore} from "@/lib/store/analytics";
import {createGroupedClick} from "@/test/analytics-utils";

const mocks = vi.hoisted(() => ({
    fetchAnalytics: vi.fn(),
    setPeriod: vi.fn(),
    setCustomDateRange: vi.fn(),
    setLocationTab: vi.fn(),
    setDeviceTab: vi.fn(),
}));

vi.mock("@/components/analytics/HorizontalBarChart", async () => ({
    HorizontalBarChart: (await import("@/test/analytics-utils")).MockHorizontalBarChart,
}));
vi.mock("@/components/analytics/AnalyticsSkeleton", () => ({
    AnalyticsPageSkeleton: () => <div data-testid="analytics-skeleton"/>,
}));
vi.mock("@/components/analytics/ClicksTimeSeriesChart", () => ({
    ClicksTimeSeriesChart: ({onZoom}: {onZoom: (range: {from: Date; to: Date}) => void}) => (
        <button onClick={() => onZoom({from: new Date("2026-10-01"), to: new Date("2026-10-03")})}>zoom chart</button>
    ),
}));

const initialStoreState = useAnalyticsStore.getState();

function loadAnalytics(overrides: Partial<ReturnType<typeof useAnalyticsStore.getState>> = {}): void {
    useAnalyticsStore.setState({
        ...initialStoreState,
        ...mocks,
        loading: false,
        isLocationLoading: false,
        isDeviceLoading: false,
        totalClicks: 1234,
        previousTotalClicks: 617,
        timeSeries: [{date: "2026-10-01", clicks: 5}],
        ...overrides,
    }, true);
}

function getCard(tabLabel: string): HTMLElement {
    const card = screen.getByRole("button", {name: tabLabel}).closest<HTMLElement>("div.rounded-xl");
    if (!card) throw new Error(`Card with tab ${tabLabel} not found`);
    return card;
}

describe("AnalyticsPage", () => {
    beforeEach(() => {
        loadAnalytics();
    });

    it("requests analytics when it mounts", () => {
        render(<AnalyticsPage/>);

        expect(mocks.fetchAnalytics).toHaveBeenCalledOnce();
    });

    it("shows the skeleton while the first load has no data", () => {
        loadAnalytics({loading: true, timeSeries: []});

        render(<AnalyticsPage/>);

        expect(screen.getByTestId("analytics-skeleton")).toBeInTheDocument();
        expect(screen.queryByText("Total Clicks")).not.toBeInTheDocument();
    });

    it("keeps the page visible while refreshing when a time series is already loaded", () => {
        loadAnalytics({loading: true});

        render(<AnalyticsPage/>);

        expect(screen.getByText("Total Clicks")).toBeInTheDocument();
        expect(screen.queryByTestId("analytics-skeleton")).not.toBeInTheDocument();
    });

    it("shows the localized total and the comparison with the previous period", () => {
        loadAnalytics({period: "P30D"});

        render(<AnalyticsPage/>);

        expect(screen.getByRole("heading", {name: (1234).toLocaleString()})).toBeInTheDocument();
        expect(screen.getByText("+100.0%")).toBeInTheDocument();
        expect(screen.getByText("vs last 30 days")).toBeInTheDocument();
    });

    it("changes the period from the selector", async () => {
        const user = userEvent.setup();
        render(<AnalyticsPage/>);

        await user.click(screen.getByRole("button", {name: "90d"}));

        expect(mocks.setPeriod).toHaveBeenCalledExactlyOnceWith("P90D");
    });

    it("applies the range dragged on the chart as a custom date range", async () => {
        const user = userEvent.setup();
        render(<AnalyticsPage/>);

        await user.click(screen.getByRole("button", {name: "zoom chart"}));

        expect(mocks.setCustomDateRange).toHaveBeenCalledExactlyOnceWith({from: new Date("2026-10-01"), to: new Date("2026-10-03")});
    });

    it("shows country data on the countries tab and continent data on the continents tab", () => {
        loadAnalytics({
            locationTab: "continents",
            countries: [createGroupedClick({label: "CA"})],
            continents: [createGroupedClick({label: "Europe"})],
        });

        render(<AnalyticsPage/>);

        expect(within(getCard("Countries")).getByText("Europe")).toBeInTheDocument();
        expect(within(getCard("Countries")).queryByText("Canada")).not.toBeInTheDocument();
    });

    it("shows device data on the devices tab and OS data on the OS tab", () => {
        loadAnalytics({
            deviceTab: "os",
            devices: [createGroupedClick({label: "Desktop"})],
            os: [createGroupedClick({label: "Linux"})],
        });

        render(<AnalyticsPage/>);

        expect(within(getCard("Devices")).getByText("Linux")).toBeInTheDocument();
        expect(within(getCard("Devices")).queryByText("Desktop")).not.toBeInTheDocument();
    });

    it("switches location and device tabs through the store", async () => {
        const user = userEvent.setup();
        render(<AnalyticsPage/>);

        await user.click(screen.getByRole("button", {name: "Continents"}));
        await user.click(screen.getByRole("button", {name: "OS"}));

        expect(mocks.setLocationTab).toHaveBeenCalledExactlyOnceWith("continents");
        expect(mocks.setDeviceTab).toHaveBeenCalledExactlyOnceWith("os");
    });

    it("shows a section-specific loading state while location data loads", () => {
        loadAnalytics({isLocationLoading: true, countries: []});

        render(<AnalyticsPage/>);

        expect(screen.getByText("Loading countries...")).toBeInTheDocument();
    });
});
