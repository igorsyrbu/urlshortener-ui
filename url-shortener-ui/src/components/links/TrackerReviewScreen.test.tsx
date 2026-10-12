import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TrackerReviewScreen} from "@/components/links/TrackerReviewScreen";
import type {TrackerEntry} from "@/lib/url-cleaner-utils";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));

const CLEANED_URL = "https://example.com/page";
const sourceTracker: TrackerEntry = {key: "utm_source", value: "news", display: "utm_source=news", location: "query"};
const mediumTracker: TrackerEntry = {key: "utm_medium", value: "email", display: "utm_medium=email", location: "query"};

interface ReviewHandlers {
    onToggle: ReturnType<typeof vi.fn<(key: string) => void>>;
    onBack: ReturnType<typeof vi.fn<() => void>>;
    onApply: ReturnType<typeof vi.fn<() => void>>;
}

function renderReview(entries: TrackerEntry[], kept: string[] = []): ReviewHandlers {
    const handlers: ReviewHandlers = {onToggle: vi.fn(), onBack: vi.fn(), onApply: vi.fn()};
    render(<TrackerReviewScreen cleanedUrl={`${CLEANED_URL}?cleaned=1`} entries={entries} kept={new Set(kept)} {...handlers}/>);
    return handlers;
}

describe("TrackerReviewScreen", () => {
    beforeEach(() => { media.isDesktop = true; });

    it("shows the base URL followed by one toggle per tracker", () => {
        renderReview([sourceTracker, mediumTracker]);

        expect(screen.getByText(`${CLEANED_URL}?`)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Remove tracker utm_source=news"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Remove tracker utm_medium=email"})).toBeInTheDocument();
    });

    it("omits the query separator when there are no trackers", () => {
        renderReview([]);

        expect(screen.getByText(CLEANED_URL)).toBeInTheDocument();
    });

    it("marks trackers the user keeps as pressed", () => {
        renderReview([sourceTracker, mediumTracker], [sourceTracker.key]);

        expect(screen.getByRole("button", {name: "Keep tracker utm_source=news"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", {name: "Remove tracker utm_medium=email"})).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles the pressed tracker by key", async () => {
        const user = userEvent.setup();
        const {onToggle} = renderReview([sourceTracker, mediumTracker]);

        await user.click(screen.getByRole("button", {name: "Remove tracker utm_medium=email"}));

        expect(onToggle).toHaveBeenCalledExactlyOnceWith(mediumTracker.key);
    });

    it("applies the review and goes back using the footer buttons on desktop", async () => {
        const user = userEvent.setup();
        const {onApply, onBack} = renderReview([sourceTracker]);

        await user.click(screen.getByRole("button", {name: "Apply"}));
        await user.click(screen.getByRole("button", {name: "Back"}));

        expect(onApply).toHaveBeenCalledOnce();
        expect(onBack).toHaveBeenCalledOnce();
        expect(screen.queryByRole("button", {name: "Back to form"})).not.toBeInTheDocument();
    });

    it("offers an extra back arrow in the header on mobile", async () => {
        media.isDesktop = false;
        const user = userEvent.setup();
        const {onBack} = renderReview([sourceTracker]);

        await user.click(screen.getByRole("button", {name: "Back to form"}));

        expect(onBack).toHaveBeenCalledOnce();
        expect(screen.getByRole("button", {name: "Apply"})).toBeInTheDocument();
    });
});
