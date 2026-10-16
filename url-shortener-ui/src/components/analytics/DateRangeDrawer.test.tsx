import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {DateRange} from "react-day-picker";
import {afterAll, afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {DateRangeDrawer} from "@/components/analytics/DateRangeDrawer";
import {FIRST_ANALYTICS_YEAR} from "@/lib/constants";

const {TEST_NOW} = vi.hoisted(() => {
    const testNow = new Date(2026, 9, 12, 15, 30);
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(testNow);
    return {TEST_NOW: testNow};
});

afterAll(() => {
    vi.useRealTimers();
});

interface RenderedDrawer {
    user: ReturnType<typeof userEvent.setup>;
    onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;
    onDateRangeSelect: ReturnType<typeof vi.fn<(range: DateRange) => void>>;
}

interface DrawerOptions {
    open?: boolean;
    period?: string;
    initialRange?: DateRange;
}

function dayOf(day: number): RegExp {
    return new RegExp(`October ${day}(st|nd|rd|th),`);
}

// The month arrows have no accessible name, so they are located relative to the month label.
function getMonthNavigationButton(direction: "previous" | "next"): HTMLElement {
    const monthLabel = screen.getByRole("button", {name: /^[A-Z][a-z]+ \d{4}$/});
    const [previous, next] = monthLabel.nextElementSibling?.querySelectorAll("button") ?? [];
    return direction === "previous" ? previous : next;
}

function renderDrawer({open = true, period = "P30D", initialRange}: DrawerOptions = {}): RenderedDrawer {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onDateRangeSelect = vi.fn<(range: DateRange) => void>();
    render(
        <DateRangeDrawer
            open={open}
            onOpenChange={onOpenChange}
            onDateRangeSelect={onDateRangeSelect}
            initialRange={initialRange}
            period={period}
        />,
    );
    return {user: userEvent.setup(), onOpenChange, onDateRangeSelect};
}

describe("DateRangeDrawer", () => {
    it("renders nothing while closed", () => {
        renderDrawer({open: false});

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens on the month of the initial range end", () => {
        renderDrawer({initialRange: {from: new Date(2026, 8, 20), to: new Date(2026, 8, 25)}});

        expect(screen.getByRole("button", {name: /September 2026/})).toBeInTheDocument();
    });

    it("opens on the current month when there is no initial range", () => {
        renderDrawer({period: "P7D"});

        expect(screen.getByRole("button", {name: /October 2026/})).toBeInTheDocument();
    });

    it("steps back one month at a time", async () => {
        const {user} = renderDrawer();
        const previousMonth = getMonthNavigationButton("previous");

        await user.click(previousMonth);

        expect(screen.getByRole("button", {name: /September 2026/})).toBeInTheDocument();
    });

    it("cannot navigate past the current month", () => {
        renderDrawer();
        const nextMonth = getMonthNavigationButton("next");

        expect(nextMonth).toBeDisabled();
    });

    it("cannot navigate before the first allowed month", () => {
        renderDrawer({initialRange: {from: new Date(2026, 0, 3), to: new Date(2026, 0, 10)}});
        const previousMonth = getMonthNavigationButton("previous");

        expect(previousMonth).toBeDisabled();
    });

    it("reports the range and closes after picking start and end days", async () => {
        const {user, onDateRangeSelect, onOpenChange} = renderDrawer();

        await user.click(screen.getByRole("button", {name: dayOf(5)}));
        expect(onDateRangeSelect).not.toHaveBeenCalled();
        await user.click(screen.getByRole("button", {name: dayOf(9)}));

        expect(onDateRangeSelect).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 5), to: new Date(2026, 9, 9)});
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("orders the range when the end is picked before the start", async () => {
        const {user, onDateRangeSelect} = renderDrawer();

        await user.click(screen.getByRole("button", {name: dayOf(9)}));
        await user.click(screen.getByRole("button", {name: dayOf(5)}));

        expect(onDateRangeSelect).toHaveBeenCalledExactlyOnceWith({from: new Date(2026, 9, 5), to: new Date(2026, 9, 9)});
    });

    it("does not allow selecting days in the future", async () => {
        const {user, onDateRangeSelect} = renderDrawer();

        const tomorrow = screen.getByRole("button", {name: dayOf(13)});
        await user.click(tomorrow);

        expect(tomorrow).toBeDisabled();
        expect(onDateRangeSelect).not.toHaveBeenCalled();
    });

    it("starts a new selection when a complete range is already set", async () => {
        const {user, onDateRangeSelect} = renderDrawer({initialRange: {from: new Date(2026, 9, 1), to: new Date(2026, 9, 3)}});

        await user.click(screen.getByRole("button", {name: dayOf(7)}));

        expect(onDateRangeSelect).not.toHaveBeenCalled();
    });

    describe("after the first analytics year", () => {
        const NEXT_YEAR = FIRST_ANALYTICS_YEAR + 1;

        beforeEach(() => {
            vi.setSystemTime(new Date(NEXT_YEAR, 0, 2, 9, 0));
        });

        afterEach(() => {
            vi.setSystemTime(TEST_NOW);
        });

        it("opens on the current month of the new year", () => {
            renderDrawer({period: "P7D"});

            expect(screen.getByRole("button", {name: `January ${NEXT_YEAR}`})).toBeInTheDocument();
        });

        it("offers the current year in the year picker", () => {
            renderDrawer();

            expect(screen.getByText(String(NEXT_YEAR))).toBeInTheDocument();
        });

        it("steps forward from December into the new year", async () => {
            const {user} = renderDrawer({
                initialRange: {from: new Date(FIRST_ANALYTICS_YEAR, 11, 1), to: new Date(FIRST_ANALYTICS_YEAR, 11, 5)},
            });

            await user.click(getMonthNavigationButton("next"));

            expect(screen.getByRole("button", {name: `January ${NEXT_YEAR}`})).toBeInTheDocument();
        });

        it("reports a range picked in the new year", async () => {
            const {user, onDateRangeSelect} = renderDrawer({period: "P7D"});

            await user.click(screen.getByRole("button", {name: /January 1st,/}));
            await user.click(screen.getByRole("button", {name: /January 2nd,/}));

            expect(onDateRangeSelect).toHaveBeenCalledExactlyOnceWith({
                from: new Date(NEXT_YEAR, 0, 1),
                to: new Date(NEXT_YEAR, 0, 2),
            });
        });
    });
});
