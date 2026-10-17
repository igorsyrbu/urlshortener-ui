import {vi} from "vitest";
import {MOBILE_BREAKPOINT_PX} from "@/lib/constants";

const DESKTOP_VIEWPORT_WIDTH_PX = MOBILE_BREAKPOINT_PX + 400;
const MOBILE_VIEWPORT_WIDTH_PX = MOBILE_BREAKPOINT_PX - 200;
const MEDIA_QUERY_WIDTH_PATTERN = /\((min|max)-width:\s*(\d+)px\)/;

function matchesWidthQuery(query: string, viewportWidth: number): boolean {
    const match = MEDIA_QUERY_WIDTH_PATTERN.exec(query);
    if (!match) return false;
    const limit = Number(match[2]);
    return match[1] === "min" ? viewportWidth >= limit : viewportWidth <= limit;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function stubMatchMedia(matches: (query: string) => boolean): void {
    vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
        matches: matches(query),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
}

function stubViewportWidth(viewportWidth: number): void {
    stubMatchMedia((query) => matchesWidthQuery(query, viewportWidth));
}

/** A desktop viewport whose user asked the OS to reduce motion. */
export function stubReducedMotion(): void {
    stubMatchMedia((query) => query === REDUCED_MOTION_QUERY || matchesWidthQuery(query, DESKTOP_VIEWPORT_WIDTH_PX));
}

export function stubDesktopViewport(): void {
    stubViewportWidth(DESKTOP_VIEWPORT_WIDTH_PX);
}

export function stubMobileViewport(): void {
    stubViewportWidth(MOBILE_VIEWPORT_WIDTH_PX);
}
