import {render, screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {ReferrersTab} from "@/components/analytics/ReferrersTab";
import {CHART_COLORS} from "@/lib/constants";
import {createGroupedClick} from "@/test/analytics-utils";

vi.mock("@/components/analytics/LazyHorizontalBarChart", async () => ({
    LazyHorizontalBarChart: (await import("@/test/analytics-utils")).MockHorizontalBarChart,
}));
vi.mock("@/components/links/LinkFavicon", () => ({
    LinkFavicon: ({longUrl}: {longUrl: string}) => <svg role="img" aria-label="favicon" data-long-url={longUrl}/>,
}));

describe("ReferrersTab", () => {
    it("shows a loading message while the first load is pending", () => {
        render(<ReferrersTab referrers={[]} isLoading totalClicks={0}/>);

        expect(screen.getByText("Loading referrers...")).toBeInTheDocument();
    });

    it("shows the empty state when there are no referrers", () => {
        render(<ReferrersTab referrers={[]} isLoading={false} totalClicks={0}/>);

        expect(screen.getByText("No referrer data active.")).toBeInTheDocument();
    });

    it("renders each referrer with the referrer colour", () => {
        const referrers = [createGroupedClick({label: "Google", clicks: 5, hostname: "google.com"})];

        render(<ReferrersTab referrers={referrers} isLoading={false} totalClicks={5}/>);

        expect(screen.getByText("Google")).toBeInTheDocument();
        expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-color", CHART_COLORS.REFERRERS);
    });

    it("loads the favicon of the referrer hostname", () => {
        const referrers = [createGroupedClick({label: "Google", hostname: "google.com"})];

        render(<ReferrersTab referrers={referrers} isLoading={false} totalClicks={10}/>);

        expect(screen.getByRole("img", {name: "favicon"})).toHaveAttribute("data-long-url", "https://google.com");
    });

    it.each([
        ["the direct marker", "(direct)"],
        ["a missing hostname", undefined],
    ])("shows a generic icon instead of a favicon for %s", (_description, hostname) => {
        const referrers = [createGroupedClick({label: "Direct", hostname})];

        render(<ReferrersTab referrers={referrers} isLoading={false} totalClicks={10}/>);

        expect(within(screen.getByTestId("bar-row")).queryByRole("img", {name: "favicon"})).not.toBeInTheDocument();
    });
});
