import {render, screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {DeviceTab} from "@/components/analytics/DeviceTab";
import {CHART_COLORS} from "@/lib/constants";
import {createGroupedClick} from "@/test/analytics-utils";

vi.mock("@/components/analytics/HorizontalBarChart", async () => ({
    HorizontalBarChart: (await import("@/test/analytics-utils")).MockHorizontalBarChart,
}));

describe("DeviceTab", () => {
    it("shows a loading message naming the active tab while the first load is pending", () => {
        render(<DeviceTab deviceTab="os" data={[]} isLoading totalClicks={0}/>);

        expect(screen.getByText("Loading os...")).toBeInTheDocument();
    });

    it("shows the empty state when there is no traffic", () => {
        render(<DeviceTab deviceTab="devices" data={[]} isLoading={false} totalClicks={0}/>);

        expect(screen.getByText("No traffic to display.")).toBeInTheDocument();
        expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });

    it("keeps showing the chart while refreshing existing data", () => {
        render(<DeviceTab deviceTab="devices" data={[createGroupedClick()]} isLoading totalClicks={10}/>);

        expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
        expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
    });

    it("passes click counts and the total to the chart", () => {
        const data = [createGroupedClick({label: "Desktop", clicks: 7}), createGroupedClick({label: "Mobile", clicks: 3})];

        render(<DeviceTab deviceTab="devices" data={data} isLoading={false} totalClicks={10}/>);

        const rows = screen.getAllByTestId("bar-row");
        expect(rows.map((row) => row.getAttribute("data-clicks"))).toEqual(["7", "3"]);
        expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-total-clicks", "10");
    });

    it("uses the device colour for devices and the OS colour for operating systems", () => {
        const {rerender} = render(<DeviceTab deviceTab="devices" data={[createGroupedClick()]} isLoading={false} totalClicks={10}/>);
        expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-color", CHART_COLORS.DEVICES);

        rerender(<DeviceTab deviceTab="os" data={[createGroupedClick({label: "Linux"})]} isLoading={false} totalClicks={10}/>);

        expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-color", CHART_COLORS.OS);
    });

    it.each([
        ["Desktop", "/icons/desktop.png"],
        ["Mobile", "/icons/mobile.png"],
        ["other", "/icons/other.png"],
        ["Smart TV", "/icons/unknown.png"],
    ])("picks the icon for the %s device", (label, iconPath) => {
        render(<DeviceTab deviceTab="devices" data={[createGroupedClick({label})]} isLoading={false} totalClicks={10}/>);

        expect(within(screen.getByTestId("bar-row")).getByRole("img", {name: label})).toHaveAttribute("src", iconPath);
    });

    it.each([
        ["Windows 11", "/icons/windows.png"],
        ["macOS", "/icons/macos.png"],
        ["Ubuntu Linux", "/icons/linux.png"],
        ["iOS", "/icons/ios.png"],
        ["Android", "/icons/android.png"],
        ["Other", "/icons/other.png"],
        ["Plan 9", "/icons/unknown.png"],
    ])("picks the icon for the %s operating system", (label, iconPath) => {
        render(<DeviceTab deviceTab="os" data={[createGroupedClick({label})]} isLoading={false} totalClicks={10}/>);

        expect(within(screen.getByTestId("bar-row")).getByRole("img", {name: label})).toHaveAttribute("src", iconPath);
    });
});
