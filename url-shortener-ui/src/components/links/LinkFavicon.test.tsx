import {act, fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {LinkFavicon} from "@/components/links/LinkFavicon";
import {FAVICON_SERVICE_URL} from "@/lib/constants";

const GOOGLE_PLACEHOLDER_SIZE = 16;

function getFaviconImage(container: HTMLElement): HTMLImageElement | null {
    return container.querySelector("img");
}

async function loadWithNaturalSize(container: HTMLElement, size: number): Promise<void> {
    const image = getFaviconImage(container);
    if (!image) throw new Error("The favicon image was not rendered");
    // jsdom never decodes images, so the size the browser would report is set by hand.
    Object.defineProperty(image, "naturalWidth", {value: size});
    Object.defineProperty(image, "naturalHeight", {value: size});
    fireEvent.load(image);
    // next/image calls onLoad from a promise callback, after the load event.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

describe("LinkFavicon", () => {
    it("loads the icon of the link's domain without telling the icon service where the user is", () => {
        const {container} = render(<LinkFavicon longUrl="https://example.com/some/page"/>);

        const image = getFaviconImage(container);
        expect(image?.getAttribute("src")).toContain(`${FAVICON_SERVICE_URL}?`);
        expect(image?.getAttribute("src")).toContain("domain=example.com");
        expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
        expect(image).toHaveAttribute("fetchpriority", "low");
    });

    it.each(["http://localhost:3000", "http://10.0.0.1/admin", "https://build.internal/x"])(
        "requests nothing for the non-public address %s",
        (longUrl) => {
            const {container} = render(<LinkFavicon longUrl={longUrl}/>);

            expect(getFaviconImage(container)).toBeNull();
        },
    );

    it("falls back to the link icon when the icon fails to load", () => {
        const {container} = render(<LinkFavicon longUrl="https://broken-icon.example"/>);
        const image = getFaviconImage(container);
        if (!image) throw new Error("The favicon image was not rendered");

        fireEvent.error(image);

        expect(getFaviconImage(container)).toBeNull();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("falls back to the link icon when the service answers with its 16 px placeholder globe", async () => {
        const {container} = render(<LinkFavicon longUrl="https://unknown-site.example"/>);

        await loadWithNaturalSize(container, GOOGLE_PLACEHOLDER_SIZE);

        expect(getFaviconImage(container)).toBeNull();
    });

    it("keeps an icon larger than the placeholder", async () => {
        const {container} = render(<LinkFavicon longUrl="https://known-site.example"/>);

        await loadWithNaturalSize(container, 32);

        expect(getFaviconImage(container)).toBeInTheDocument();
    });
});
