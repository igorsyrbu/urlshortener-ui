import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {AnalyticsCard} from "@/components/analytics/AnalyticsCard";

describe("AnalyticsCard", () => {
    it("renders the title and children when no tabs are given", () => {
        render(<AnalyticsCard title="Top Links"><p>chart body</p></AnalyticsCard>);

        expect(screen.getByText("Top Links")).toBeInTheDocument();
        expect(screen.getByText("chart body")).toBeInTheDocument();
        expect(screen.getByText("Clicks")).toBeInTheDocument();
    });

    it("renders tabs instead of the title when tabs are given", () => {
        const tabs = [{label: "Countries", value: "countries", isActive: true}];

        render(<AnalyticsCard title="Ignored" tabs={tabs}><p>body</p></AnalyticsCard>);

        expect(screen.getByRole("button", {name: "Countries"})).toBeInTheDocument();
        expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
    });

    it("reports the value of the clicked tab", async () => {
        const user = userEvent.setup();
        const handleTabChange = vi.fn();
        const tabs = [
            {label: "Devices", value: "devices", isActive: true},
            {label: "OS", value: "os", isActive: false},
        ];
        render(<AnalyticsCard tabs={tabs} onTabChange={handleTabChange}><p>body</p></AnalyticsCard>);

        await user.click(screen.getByRole("button", {name: "OS"}));

        expect(handleTabChange).toHaveBeenCalledExactlyOnceWith("os");
    });

    it("does not fail when a tab is clicked without a change handler", async () => {
        const user = userEvent.setup();
        const tabs = [{label: "OS", value: "os", isActive: false}];
        render(<AnalyticsCard tabs={tabs}><p>body</p></AnalyticsCard>);

        await user.click(screen.getByRole("button", {name: "OS"}));

        expect(screen.getByText("body")).toBeInTheDocument();
    });
});
