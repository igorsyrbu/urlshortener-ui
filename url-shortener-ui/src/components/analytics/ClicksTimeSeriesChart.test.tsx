import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ClicksTimeSeriesChart} from "@/components/analytics/ClicksTimeSeriesChart";
import type {AnalyticsDailyClick} from "@/lib/store/analytics";
import {FAR_FROM_UTC_TIME_ZONES} from "@/test/time-zone-utils";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

const CHART_LEFT_PX = 0;
const Y_AXIS_WIDTH_PX = 40;
const PLOT_WIDTH_PX = 400;
const CHART_WIDTH_PX = Y_AXIS_WIDTH_PX + PLOT_WIDTH_PX;

const WEEK_OF_CLICKS: AnalyticsDailyClick[] = [
    {date: "2026-10-01", clicks: 1},
    {date: "2026-10-02", clicks: 4},
    {date: "2026-10-03", clicks: 2},
    {date: "2026-10-04", clicks: 8},
    {date: "2026-10-05", clicks: 3},
];

function xAtDataIndex(index: number): number {
    return CHART_LEFT_PX + Y_AXIS_WIDTH_PX + (PLOT_WIDTH_PX * index) / (WEEK_OF_CLICKS.length - 1);
}

function getDragSurface(): HTMLElement {
    const surface = document.querySelector<HTMLElement>(".select-none");
    if (!surface) throw new Error("Chart drag surface was not rendered");
    return surface;
}

function mockChartBounds(): void {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
        new DOMRect(CHART_LEFT_PX, 0, CHART_WIDTH_PX, 300),
    );
}

async function dragAcross(user: ReturnType<typeof userEvent.setup>, fromIndex: number, toIndex: number): Promise<void> {
    await user.pointer([
        {keys: "[MouseLeft>]", target: getDragSurface(), coords: {clientX: xAtDataIndex(fromIndex)}},
        {coords: {clientX: xAtDataIndex(toIndex)}},
        {keys: "[/MouseLeft]"},
    ]);
}

describe("ClicksTimeSeriesChart", () => {
    beforeEach(() => {
        mockChartBounds();
    });

    it("shows a placeholder while there is no data", () => {
        stubDesktopViewport();

        render(<ClicksTimeSeriesChart timeSeries={[]} onZoom={vi.fn()}/>);

        expect(screen.getByText("Gathering chart data...")).toBeInTheDocument();
    });

    it("zooms to the dragged day range on desktop", async () => {
        stubDesktopViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);

        await dragAcross(user, 1, 3);

        expect(onZoom).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 2), to: new Date(2026, 9, 4)});
    });

    it("orders the zoom range when dragging right to left", async () => {
        stubDesktopViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);

        await dragAcross(user, 4, 0);

        expect(onZoom).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 1), to: new Date(2026, 9, 5)});
    });

    it("clamps drags that leave the plot area to the first and last day", async () => {
        stubDesktopViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);

        await user.pointer([
            {keys: "[MouseLeft>]", target: getDragSurface(), coords: {clientX: CHART_LEFT_PX - 100}},
            {coords: {clientX: CHART_WIDTH_PX + 500}},
            {keys: "[/MouseLeft]"},
        ]);

        expect(onZoom).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 1), to: new Date(2026, 9, 5)});
    });

    it("does not zoom when the pointer is released on the day it was pressed", async () => {
        stubDesktopViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);

        await dragAcross(user, 2, 2);

        expect(onZoom).not.toHaveBeenCalled();
    });

    it("cancels the selection when the pointer leaves the chart", async () => {
        stubDesktopViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);
        const surface = getDragSurface();

        await user.pointer([
            {keys: "[MouseLeft>]", target: surface, coords: {clientX: xAtDataIndex(0)}},
            {coords: {clientX: xAtDataIndex(2)}},
        ]);
        await user.unhover(surface);
        await user.pointer({keys: "[/MouseLeft]", target: surface, coords: {clientX: xAtDataIndex(4)}});

        expect(onZoom).not.toHaveBeenCalled();
    });

    it("ignores drags on mobile", async () => {
        stubMobileViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);

        await dragAcross(user, 0, 4);

        expect(onZoom).not.toHaveBeenCalled();
    });
});

describe.each(FAR_FROM_UTC_TIME_ZONES)("ClicksTimeSeriesChart zoom in %s", (timeZone) => {
    beforeEach(() => {
        vi.stubEnv("TZ", timeZone);
        mockChartBounds();
    });

    it("zooms to the local calendar days of the dragged data points", async () => {
        stubDesktopViewport();
        const user = userEvent.setup();
        const onZoom = vi.fn();
        render(<ClicksTimeSeriesChart timeSeries={WEEK_OF_CLICKS} onZoom={onZoom}/>);

        await dragAcross(user, 1, 3);

        expect(onZoom).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 2), to: new Date(2026, 9, 4)});
    });
});
