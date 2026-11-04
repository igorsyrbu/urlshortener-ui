import {screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import AnalyticsPage from "@/app/(dashboard)/analytics/page";
import {fetchWithAuth} from "@/lib/api";
import {ANALYTICS_COPY, API_ENDPOINTS} from "@/lib/constants";
import {HTTP_INTERNAL_SERVER_ERROR} from "@/lib/http-status";
import {useAnalyticsStore} from "@/lib/store/analytics";
import {mockAnalyticsApi} from "@/test/analytics-utils";
import {renderWithQuery} from "@/test/query-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));
vi.mock("@/components/analytics/LazyHorizontalBarChart", async () => ({
    LazyHorizontalBarChart: (await import("@/test/analytics-utils")).MockHorizontalBarChart,
}));
vi.mock("@/components/analytics/AnalyticsSkeleton", () => ({
    AnalyticsPageSkeleton: () => <div data-testid="analytics-skeleton"/>,
}));
const loadAnalyticsCharts = vi.hoisted(() => vi.fn());

vi.mock("@/components/analytics/load-analytics-charts", () => ({loadAnalyticsCharts}));
vi.mock("@/components/analytics/LazyClicksTimeSeriesChart", () => ({
    LazyClicksTimeSeriesChart: ({onZoom}: {onZoom: (range: {from: Date; to: Date}) => void}) => (
        <button onClick={() => onZoom({from: new Date(2026, 9, 1), to: new Date(2026, 9, 3)})}>zoom chart</button>
    ),
}));

const initialStoreState = useAnalyticsStore.getInitialState();
const NEVER_ANSWERED = new Promise<Response>(() => undefined);
const TOTAL = 1234;

function serverError(): Response {
    return new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR});
}

function requestedUrls(): string[] {
    return vi.mocked(fetchWithAuth).mock.calls.map(([url]) => url);
}

function getCard(label: string): HTMLElement {
    const card = screen.getByText(label, {selector: "button, h3, p, span"}).closest<HTMLElement>("div.rounded-xl");
    if (!card) throw new Error(`Card ${label} not found`);
    return card;
}

async function findCard(label: string): Promise<HTMLElement> {
    await screen.findByText(label, {selector: "button, h3, p, span"});
    return getCard(label);
}

async function renderLoadedPage(): Promise<void> {
    mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: Response.json(TOTAL), previous: Response.json(617)});
    renderWithQuery(<AnalyticsPage/>);
    await screen.findByRole("heading", {name: TOTAL.toLocaleString()});
}

describe("AnalyticsPage", () => {
    afterEach(() => {
        useAnalyticsStore.setState(initialStoreState, true);
    });

    it("requests the selected period when it mounts", async () => {
        await renderLoadedPage();

        expect(requestedUrls()).toEqual(expect.arrayContaining([
            `${API_ENDPOINTS.ANALYTICS}?period=P7D`,
            `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=date`,
            `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=referrer`,
            `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=top_link`,
            `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=country`,
            `${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=device`,
        ]));
    });

    it("starts downloading the charts while the data loads", () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: NEVER_ANSWERED});

        renderWithQuery(<AnalyticsPage/>);

        expect(loadAnalyticsCharts).toHaveBeenCalledOnce();
    });

    it("shows the skeleton while the first load has no data", () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: NEVER_ANSWERED});

        renderWithQuery(<AnalyticsPage/>);

        expect(screen.getByTestId("analytics-skeleton")).toBeInTheDocument();
        expect(screen.queryByText("Total Clicks")).not.toBeInTheDocument();
    });

    it("offers a retry instead of an empty page when the first load fails", async () => {
        const user = userEvent.setup();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: serverError()});
        renderWithQuery(<AnalyticsPage/>);

        expect(await screen.findByRole("alert")).toHaveTextContent(ANALYTICS_COPY.LOAD_FAILED);
        expect(screen.queryByText("Total Clicks")).not.toBeInTheDocument();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: Response.json(TOTAL)});
        await user.click(screen.getByRole("button", {name: ANALYTICS_COPY.RETRY}));

        expect(await screen.findByRole("heading", {name: TOTAL.toLocaleString()})).toBeInTheDocument();
    });

    it("is not marked busy once the data is loaded", async () => {
        await renderLoadedPage();

        expect(screen.getByText("Total Clicks").closest("[aria-busy]")).toHaveAttribute("aria-busy", "false");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("keeps the loaded numbers visible and marks them busy while a new period loads", async () => {
        const user = userEvent.setup();
        await renderLoadedPage();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: NEVER_ANSWERED});

        await user.click(screen.getByRole("button", {name: "90d"}));

        expect(screen.getByText("Total Clicks").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
        expect(screen.getByRole("status")).toHaveTextContent(ANALYTICS_COPY.UPDATING);
        expect(screen.getByRole("heading", {name: TOTAL.toLocaleString()})).toBeInTheDocument();
        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?period=P90D`);
    });

    it("keeps the last numbers and offers a retry when a new period fails", async () => {
        const user = userEvent.setup();
        await renderLoadedPage();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: serverError()});

        await user.click(screen.getByRole("button", {name: "90d"}));

        expect(await screen.findByRole("alert")).toHaveTextContent(ANALYTICS_COPY.REFRESH_FAILED);
        expect(screen.getByRole("heading", {name: TOTAL.toLocaleString()})).toBeInTheDocument();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: Response.json(99)});
        await user.click(screen.getByRole("button", {name: ANALYTICS_COPY.RETRY}));

        expect(await screen.findByRole("heading", {name: "99"})).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows a period viewed moments ago at once, without requesting it again", async () => {
        const user = userEvent.setup();
        await renderLoadedPage();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {total: Response.json(99)});
        await user.click(screen.getByRole("button", {name: "90d"}));
        await screen.findByRole("heading", {name: "99"});
        vi.mocked(fetchWithAuth).mockClear();

        await user.click(screen.getByRole("button", {name: "7d"}));

        expect(screen.getByRole("heading", {name: TOTAL.toLocaleString()})).toBeInTheDocument();
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("shows a failed card with its own retry while the other cards keep their data", async () => {
        const user = userEvent.setup();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: serverError(), device: Response.json([{label: "Desktop", clicks: 3}])});
        renderWithQuery(<AnalyticsPage/>);
        const retry = await within(await findCard("Countries")).findByRole("button", {name: ANALYTICS_COPY.RETRY});
        expect(within(getCard("Devices")).getByText("Desktop")).toBeInTheDocument();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: Response.json([{label: "CA", clicks: 7}])});
        vi.mocked(fetchWithAuth).mockClear();

        await user.click(retry);

        expect(await within(getCard("Countries")).findByText("Canada")).toBeInTheDocument();
        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.ANALYTICS}?period=P7D&groupBy=country`]);
    });

    it("shows failed referrers with their own retry", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {referrer: serverError()});

        renderWithQuery(<AnalyticsPage/>);

        expect(await within(await findCard("Referrers")).findByRole("button", {name: ANALYTICS_COPY.RETRY})).toBeInTheDocument();
    });

    it("shows the localized total and the comparison with the previous period", async () => {
        useAnalyticsStore.getState().setPeriod("P30D");

        await renderLoadedPage();

        expect(screen.getByText("+100.0%")).toBeInTheDocument();
        expect(screen.getByText("vs last 30 days")).toBeInTheDocument();
    });

    it("loads the range dragged on the chart as a custom date range", async () => {
        const user = userEvent.setup();
        await renderLoadedPage();

        await user.click(screen.getByRole("button", {name: "zoom chart"}));

        expect(requestedUrls()).toContain(`${API_ENDPOINTS.ANALYTICS}?start=2026-10-01&end=2026-10-03&groupBy=date`);
    });

    it("loads continents only when their tab is opened, and shows them instead of countries", async () => {
        const user = userEvent.setup();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {
            country: Response.json([{label: "CA", clicks: 7}]),
            continent: Response.json([{label: "Europe", clicks: 2}]),
        });
        renderWithQuery(<AnalyticsPage/>);
        await within(await findCard("Countries")).findByText("Canada");
        expect(requestedUrls().some((url) => url.includes("groupBy=continent"))).toBe(false);

        await user.click(screen.getByRole("button", {name: "Continents"}));

        expect(await within(getCard("Countries")).findByText("Europe")).toBeInTheDocument();
        expect(within(getCard("Countries")).queryByText("Canada")).not.toBeInTheDocument();
    });

    it("loads operating systems when the OS tab is opened, and shows them instead of devices", async () => {
        const user = userEvent.setup();
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {
            device: Response.json([{label: "Desktop", clicks: 3}]),
            os: Response.json([{label: "Linux", clicks: 2}]),
        });
        renderWithQuery(<AnalyticsPage/>);
        await within(await findCard("Devices")).findByText("Desktop");

        await user.click(screen.getByRole("button", {name: "OS"}));

        expect(await within(getCard("Devices")).findByText("Linux")).toBeInTheDocument();
        expect(within(getCard("Devices")).queryByText("Desktop")).not.toBeInTheDocument();
    });

    it("shows a section-specific loading state while location data loads", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {country: NEVER_ANSWERED});

        renderWithQuery(<AnalyticsPage/>);

        expect(await screen.findByText("Loading countries...")).toBeInTheDocument();
    });

    it("shows the top links spinner before their first answer instead of an empty state", async () => {
        mockAnalyticsApi(vi.mocked(fetchWithAuth), {top_link: NEVER_ANSWERED});

        renderWithQuery(<AnalyticsPage/>);

        expect(await screen.findByText("Loading top links...")).toBeInTheDocument();
    });
});
