import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {ComparisonBadge} from "@/components/analytics/ComparisonBadge";

function renderBadge(period: string, totalClicks: number, previousTotalClicks: number | null): void {
    render(<ComparisonBadge period={period} totalClicks={totalClicks} previousTotalClicks={previousTotalClicks}/>);
}

describe("ComparisonBadge", () => {
    it("shows a signed percentage increase against the previous period", () => {
        renderBadge("P30D", 150, 100);

        expect(screen.getByText("+50.0%")).toBeInTheDocument();
        expect(screen.getByText("vs last 30 days")).toBeInTheDocument();
    });

    it("shows a negative percentage decrease", () => {
        renderBadge("P7D", 50, 200);

        expect(screen.getByText("-75.0%")).toBeInTheDocument();
        expect(screen.getByText("vs last 7 days")).toBeInTheDocument();
    });

    it("shows 0.0% without a plus sign when clicks are unchanged", () => {
        renderBadge("P30D", 100, 100);

        expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("reports +100% when the previous period had no clicks and the current one does", () => {
        renderBadge("P30D", 12, 0);

        expect(screen.getByText("+100.0%")).toBeInTheDocument();
    });

    it("reports 0.0% when both periods had no clicks", () => {
        renderBadge("P30D", 0, 0);

        expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("falls back to 30 days when the period has no number", () => {
        renderBadge("weekly", 10, 5);

        expect(screen.getByText("vs last 30 days")).toBeInTheDocument();
    });

    it("renders nothing without previous period data", () => {
        renderBadge("P30D", 10, null);

        expect(screen.queryByText(/vs last/)).not.toBeInTheDocument();
    });

    it("renders nothing for a custom date range", () => {
        renderBadge("custom", 10, 5);

        expect(screen.queryByText(/vs last/)).not.toBeInTheDocument();
    });
});
