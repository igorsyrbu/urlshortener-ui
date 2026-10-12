import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {UrlCleanerBanner} from "@/components/links/UrlCleanerBanner";
import {UrlCleanerSuccessBanner} from "@/components/links/UrlCleanerSuccessBanner";
import {URL_CLEANER_TOOLTIP} from "@/lib/constants";

describe("UrlCleanerBanner", () => {
    it.each([
        [1, "1 tracker detected"],
        [3, "3 trackers detected"],
    ])("announces %i detected tracker(s)", (trackerCount, label) => {
        render(<UrlCleanerBanner trackerCount={trackerCount} onClean={vi.fn()} onReview={vi.fn()}/>);

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it("cleans the URL when the clean button is pressed", async () => {
        const user = userEvent.setup();
        const onClean = vi.fn();
        const onReview = vi.fn();
        render(<UrlCleanerBanner trackerCount={2} onClean={onClean} onReview={onReview}/>);

        await user.click(screen.getByRole("button", {name: "Clean trackers from URL"}));

        expect(onClean).toHaveBeenCalledOnce();
        expect(onReview).not.toHaveBeenCalled();
    });

    it("opens the review when the review button is pressed", async () => {
        const user = userEvent.setup();
        const onClean = vi.fn();
        const onReview = vi.fn();
        render(<UrlCleanerBanner trackerCount={2} onClean={onClean} onReview={onReview}/>);

        await user.click(screen.getByRole("button", {name: "Review trackers"}));

        expect(onReview).toHaveBeenCalledOnce();
        expect(onClean).not.toHaveBeenCalled();
    });

    it("explains tracker removal when the info button is hovered", async () => {
        const user = userEvent.setup();
        render(<UrlCleanerBanner trackerCount={2} onClean={vi.fn()} onReview={vi.fn()}/>);

        await user.hover(screen.getByRole("button", {name: "About tracker removal"}));

        expect(await screen.findByRole("tooltip")).toHaveTextContent(URL_CLEANER_TOOLTIP);
    });
});

describe("UrlCleanerSuccessBanner", () => {
    it.each([
        [1, "1 tracker removed"],
        [4, "4 trackers removed"],
    ])("reports %i removed tracker(s)", (trackerCount, label) => {
        render(<UrlCleanerSuccessBanner trackerCount={trackerCount}/>);

        expect(screen.getByText(label)).toBeInTheDocument();
    });
});
