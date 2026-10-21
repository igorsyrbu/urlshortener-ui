import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {OgImage} from "@/components/inspect/OgImage";

const IMAGE_GIVE_UP_TIMEOUT_MS = 8000;
const SLOW_IMAGE_MS = 3000;
const PROXY_BASE = "https://wsrv.nl";
const IMAGE_URL = "https://cdn.example.com/cover image.png?size=large&v=2";
const ALT_TEXT = "Page cover";

function proxiedUrl(url: string): string {
    const params = new URLSearchParams({url, w: "1344", output: "webp", q: "80", we: "1"});
    return `${PROXY_BASE}/?${params.toString()}`;
}

function getPreviewImage(): HTMLElement {
    return screen.getByRole("img", {name: ALT_TEXT});
}

function advanceTime(ms: number): void {
    act(() => {
        vi.advanceTimersByTime(ms);
    });
}

describe("OgImage", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows a placeholder when the link has no image", () => {
        render(<OgImage src={undefined} alt={ALT_TEXT}/>);

        expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
        expect(screen.queryByRole("img", {name: ALT_TEXT})).not.toBeInTheDocument();
    });

    it("shows a placeholder when the image address is null", () => {
        render(<OgImage src={null} alt={ALT_TEXT}/>);

        expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    });

    it("loads a resized webp copy through the proxy with high priority", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        expect(getPreviewImage()).toHaveAttribute("src", proxiedUrl(IMAGE_URL));
        expect(getPreviewImage()).toHaveAttribute("fetchpriority", "high");
        expect(getPreviewImage()).not.toHaveAttribute("loading", "lazy");
    });

    it("does not cover the image with a loading overlay that waits for the page to become interactive", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();
    });

    it("does not leak the referrer to the image host", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        expect(getPreviewImage()).toHaveAttribute("referrerpolicy", "no-referrer");
    });

    it("keeps waiting for a proxied image that is slow but still downloading", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        advanceTime(SLOW_IMAGE_MS);
        fireEvent.load(getPreviewImage());

        expect(getPreviewImage()).toHaveAttribute("src", proxiedUrl(IMAGE_URL));
    });

    it("falls back to the original address when the proxy fails", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        fireEvent.error(getPreviewImage());

        expect(getPreviewImage()).toHaveAttribute("src", IMAGE_URL);
        expect(screen.queryByText("Preview unavailable")).not.toBeInTheDocument();
    });

    it("shows the placeholder when the original address fails too", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        fireEvent.error(getPreviewImage());
        fireEvent.error(getPreviewImage());

        expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    });

    it("gives up when the image never arrives", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        advanceTime(IMAGE_GIVE_UP_TIMEOUT_MS);

        expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    });

    it("does not give up on an image that already loaded", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);
        fireEvent.load(getPreviewImage());

        advanceTime(IMAGE_GIVE_UP_TIMEOUT_MS);

        expect(getPreviewImage()).toHaveAttribute("src", proxiedUrl(IMAGE_URL));
    });

    it("starts loading the new image when the address changes after a failure", () => {
        const {rerender} = render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);
        fireEvent.error(getPreviewImage());
        fireEvent.error(getPreviewImage());

        rerender(<OgImage src="https://cdn.example.com/other.png" alt={ALT_TEXT}/>);

        expect(getPreviewImage()).toHaveAttribute("src", proxiedUrl("https://cdn.example.com/other.png"));
    });
});
