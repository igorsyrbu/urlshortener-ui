import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {TopLinksTab} from "@/components/analytics/TopLinksTab";
import {CHART_COLORS} from "@/lib/constants";
import {createLinkItem} from "@/test/link-utils";

vi.mock("@/components/analytics/HorizontalBarChart", async () => ({
    HorizontalBarChart: (await import("@/test/analytics-utils")).MockHorizontalBarChart,
}));
vi.mock("@/components/links/LinkFavicon", () => ({
    LinkFavicon: ({longUrl}: {longUrl: string}) => <svg role="img" aria-label="favicon" data-long-url={longUrl}/>,
}));

describe("TopLinksTab", () => {
    it("shows a loading message while the first load is pending", () => {
        render(<TopLinksTab topLinks={[]} isLoading totalClicks={0}/>);

        expect(screen.getByText("Loading top links...")).toBeInTheDocument();
    });

    it("shows the empty state when there are no top links", () => {
        render(<TopLinksTab topLinks={[]} isLoading={false} totalClicks={0}/>);

        expect(screen.getByText("No top links data available.")).toBeInTheDocument();
    });

    it("sorts links by clicks, highest first, and labels them with the short URL", () => {
        const topLinks = [
            {shortLinkId: "a", clicks: 2, details: createLinkItem({shortUrl: "https://sho.rt/a"})},
            {shortLinkId: "b", clicks: 9, details: createLinkItem({shortUrl: "https://sho.rt/b"})},
        ];

        render(<TopLinksTab topLinks={topLinks} isLoading={false} totalClicks={11}/>);

        expect(screen.getAllByTestId("bar-row").map((row) => row.textContent)).toEqual(["https://sho.rt/b", "https://sho.rt/a"]);
        expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-color", CHART_COLORS.TOP_LINKS);
    });

    it("falls back to the link id when link details are not loaded", () => {
        render(<TopLinksTab topLinks={[{shortLinkId: "orphan-id", clicks: 3}]} isLoading={false} totalClicks={3}/>);

        expect(screen.getByText("orphan-id")).toBeInTheDocument();
        expect(screen.queryByRole("img", {name: "favicon"})).not.toBeInTheDocument();
    });

    it("loads the favicon of the destination URL when details are available", () => {
        const details = createLinkItem({longUrl: "https://example.com/article"});

        render(<TopLinksTab topLinks={[{shortLinkId: "a", clicks: 3, details}]} isLoading={false} totalClicks={3}/>);

        expect(screen.getByRole("img", {name: "favicon"})).toHaveAttribute("data-long-url", "https://example.com/article");
    });

    it("does not reorder the caller's data array", () => {
        const topLinks = [{shortLinkId: "a", clicks: 1}, {shortLinkId: "b", clicks: 5}];

        render(<TopLinksTab topLinks={topLinks} isLoading={false} totalClicks={6}/>);

        expect(topLinks.map((link) => link.shortLinkId)).toEqual(["a", "b"]);
    });
});
