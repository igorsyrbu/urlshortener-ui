import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {DateRange} from "react-day-picker";
import {afterAll, afterEach, describe, expect, it, vi} from "vitest";
import {PeriodSelector} from "@/components/analytics/PeriodSelector";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

const {TEST_NOW} = vi.hoisted(() => {
    const testNow = new Date(2026, 9, 12, 15, 30);
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(testNow);
    return {TEST_NOW: testNow};
});

afterAll(() => {
    vi.useRealTimers();
});

function dayOf(day: number, month = "October"): RegExp {
    return new RegExp(`${month} ${day}(st|nd|rd|th),`);
}

interface RenderedSelector {
    user: ReturnType<typeof userEvent.setup>;
    onPeriodChange: ReturnType<typeof vi.fn<(period: string) => void>>;
    onCustomDateRangeChange: ReturnType<typeof vi.fn<(range: DateRange) => void>>;
}

function renderSelector(period = "P30D"): RenderedSelector {
    const onPeriodChange = vi.fn<(period: string) => void>();
    const onCustomDateRangeChange = vi.fn<(range: DateRange) => void>();
    render(
        <PeriodSelector
            period={period}
            customDateRange={undefined}
            onPeriodChange={onPeriodChange}
            onCustomDateRangeChange={onCustomDateRangeChange}
        />,
    );
    return {user: userEvent.setup(), onPeriodChange, onCustomDateRangeChange};
}

async function openCalendar(user: RenderedSelector["user"]): Promise<void> {
    await user.click(screen.getByRole("button", {name: "Custom"}));
    await screen.findByRole("grid", {name: /October 2026/});
}

describe("PeriodSelector on desktop", () => {
    it.each([["7d", "P7D"], ["30d", "P30D"], ["90d", "P90D"]])("selects the %s preset", async (label, period) => {
        stubDesktopViewport();
        const {user, onPeriodChange} = renderSelector();

        await user.click(screen.getByRole("button", {name: label}));

        expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith(period);
    });

    it("reports a custom range after picking two days in order", async () => {
        stubDesktopViewport();
        const {user, onCustomDateRangeChange} = renderSelector();
        await openCalendar(user);

        await user.click(screen.getByRole("button", {name: dayOf(5)}));
        expect(onCustomDateRangeChange).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", {name: dayOf(9)}));

        expect(onCustomDateRangeChange).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 5), to: new Date(2026, 9, 9)});
    });

    it("swaps the days when the end is picked before the start", async () => {
        stubDesktopViewport();
        const {user, onCustomDateRangeChange} = renderSelector();
        await openCalendar(user);

        await user.click(screen.getByRole("button", {name: dayOf(9)}));
        await user.click(screen.getByRole("button", {name: dayOf(5)}));

        expect(onCustomDateRangeChange).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 5), to: new Date(2026, 9, 9)});
    });

    it("does not allow selecting days in the future", async () => {
        stubDesktopViewport();
        const {user, onCustomDateRangeChange} = renderSelector();
        await openCalendar(user);

        const tomorrow = screen.getByRole("button", {name: dayOf(13)});
        await user.click(tomorrow);

        expect(tomorrow).toBeDisabled();
        expect(onCustomDateRangeChange).not.toHaveBeenCalled();
    });

    it("allows selecting today as the end of the range", async () => {
        stubDesktopViewport();
        const {user, onCustomDateRangeChange} = renderSelector();
        await openCalendar(user);

        await user.click(screen.getByRole("button", {name: dayOf(10)}));
        await user.click(screen.getByRole("button", {name: dayOf(12)}));

        expect(onCustomDateRangeChange).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 10), to: new Date(2026, 9, 12)});
    });
});

describe("PeriodSelector after midnight", () => {
    afterEach(() => {
        vi.setSystemTime(TEST_NOW);
    });

    it("lets the user pick the new day when the page was loaded the day before", async () => {
        stubDesktopViewport();
        vi.setSystemTime(new Date(2026, 9, 13, 0, 5));
        const {user, onCustomDateRangeChange} = renderSelector();
        await openCalendar(user);

        await user.click(screen.getByRole("button", {name: dayOf(12)}));
        await user.click(screen.getByRole("button", {name: dayOf(13)}));

        expect(onCustomDateRangeChange).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 12), to: new Date(2026, 9, 13)});
    });
});

describe("PeriodSelector on mobile", () => {
    it("opens the date range drawer instead of the popover calendar", async () => {
        stubMobileViewport();
        const {user} = renderSelector();

        await user.click(screen.getByRole("button", {name: "Custom"}));

        const drawer = await screen.findByRole("dialog");
        expect(within(drawer).getByText("Select Date Range")).toBeInTheDocument();
    });

    it("reports the range picked in the drawer and closes it", async () => {
        stubMobileViewport();
        const {user, onCustomDateRangeChange} = renderSelector();
        await user.click(screen.getByRole("button", {name: "Custom"}));
        const drawer = await screen.findByRole("dialog");

        await user.click(screen.getByRole("button", {name: dayOf(5)}));
        await user.click(screen.getByRole("button", {name: dayOf(9)}));

        expect(onCustomDateRangeChange).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 5), to: new Date(2026, 9, 9)});
        expect(drawer).toHaveAttribute("data-state", "closed");
    });
});
