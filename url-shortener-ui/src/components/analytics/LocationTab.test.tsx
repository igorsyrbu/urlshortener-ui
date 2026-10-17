import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {LocationTab} from "@/components/analytics/LocationTab";
import {CHART_COLORS} from "@/lib/constants";
import {createGroupedClick} from "@/test/analytics-utils";

vi.mock("@/components/analytics/LazyHorizontalBarChart", async () => ({
    LazyHorizontalBarChart: (await import("@/test/analytics-utils")).MockHorizontalBarChart,
}));

describe("LocationTab", () => {
    it("shows a loading message naming the active tab while the first load is pending", () => {
        render(<LocationTab locationTab="countries" data={[]} isLoading totalClicks={0}/>);

        expect(screen.getByText("Loading countries...")).toBeInTheDocument();
    });

    it("shows the empty state when there is no location data", () => {
        render(<LocationTab locationTab="continents" data={[]} isLoading={false} totalClicks={0}/>);

        expect(screen.getByText("No location data available for this period.")).toBeInTheDocument();
    });

    it("lists countries by full name, most clicks first, with their flags", () => {
        const data = [createGroupedClick({label: "FR", clicks: 2}), createGroupedClick({label: "CA", clicks: 9})];

        render(<LocationTab locationTab="countries" data={data} isLoading={false} totalClicks={11}/>);

        expect(screen.getAllByTestId("bar-row").map((row) => row.textContent)).toEqual(["Canada", "France"]);
        expect(screen.getByRole("img", {name: "CA"}).querySelector("use")?.getAttribute("href")).toMatch(/#ca$/);
        expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-color", CHART_COLORS.LOCATIONS);
    });

    it("lists continents by their raw label without flags", () => {
        const data = [createGroupedClick({label: "Europe", clicks: 4}), createGroupedClick({label: "Asia", clicks: 8})];

        render(<LocationTab locationTab="continents" data={data} isLoading={false} totalClicks={12}/>);

        expect(screen.getAllByTestId("bar-row").map((row) => row.textContent)).toEqual(["Asia", "Europe"]);
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("does not reorder the caller's data array", () => {
        const data = [createGroupedClick({label: "Europe", clicks: 1}), createGroupedClick({label: "Asia", clicks: 5})];

        render(<LocationTab locationTab="continents" data={data} isLoading={false} totalClicks={6}/>);

        expect(data.map((item) => item.label)).toEqual(["Europe", "Asia"]);
    });
});
