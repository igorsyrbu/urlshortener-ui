import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {OgImage} from "@/components/inspect/OgImage";

const IMAGE_LOAD_TIMEOUT_MS = 2000;
const PROXY_BASE = "https://wsrv.nl";
const IMAGE_URL = "https://cdn.example.com/cover image.png?size=large&v=2";
const PROXIED_IMAGE_URL = `${PROXY_BASE}/?url=${encodeURIComponent(IMAGE_URL)}`;
const ALT_TEXT = "Page cover";

function getPreviewImage(): HTMLElement {
    return screen.getByRole("img", {name: ALT_TEXT});
}

function advanceLoadTimeout(): void {
    act(() => {
        vi.advanceTimersByTime(IMAGE_LOAD_TIMEOUT_MS);
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

    it("loads the image through the proxy and shows a loading state", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        expect(getPreviewImage()).toHaveAttribute("src", PROXIED_IMAGE_URL);
        expect(screen.getByText("Loading preview...")).toBeInTheDocument();
    });

    it("does not leak the referrer to the image host", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        expect(getPreviewImage()).toHaveAttribute("referrerpolicy", "no-referrer");
    });

    it("hides the loading state once the image has loaded", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        fireEvent.load(getPreviewImage());

        expect(screen.queryByText("Loading preview...")).not.toBeInTheDocument();
        expect(getPreviewImage()).toBeInTheDocument();
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

    it("falls back to the original address when the proxy never answers", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        advanceLoadTimeout();

        expect(getPreviewImage()).toHaveAttribute("src", IMAGE_URL);
    });

    it("gives up after the original address also times out", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);

        advanceLoadTimeout();
        advanceLoadTimeout();

        expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    });

    it("does not time out an image that already loaded", () => {
        render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);
        fireEvent.load(getPreviewImage());

        advanceLoadTimeout();

        expect(getPreviewImage()).toHaveAttribute("src", PROXIED_IMAGE_URL);
    });

    it("starts loading the new image when the address changes after a failure", () => {
        const {rerender} = render(<OgImage src={IMAGE_URL} alt={ALT_TEXT}/>);
        fireEvent.error(getPreviewImage());
        fireEvent.error(getPreviewImage());

        rerender(<OgImage src="https://cdn.example.com/other.png" alt={ALT_TEXT}/>);

        expect(getPreviewImage()).toHaveAttribute("src", `${PROXY_BASE}/?url=${encodeURIComponent("https://cdn.example.com/other.png")}`);
    });
});
