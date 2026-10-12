import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {MOBILE_BREAKPOINT_PX} from "@/lib/constants";
import {useIsDesktop, useIsMobile} from "@/lib/hooks/useMediaQuery";

class FakeMediaQueryList extends EventTarget implements MediaQueryList {
    onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;

    constructor(readonly media: string, public matches: boolean) {
        super();
    }

    addListener(): void {}

    removeListener(): void {}
}

interface FakeMediaQuery {
    lists: FakeMediaQueryList[];
    setMatches: (matches: boolean) => void;
}

function stubMatchMedia(matchingQuery: string | null): FakeMediaQuery {
    const lists: FakeMediaQueryList[] = [];
    vi.mocked(window.matchMedia).mockImplementation((query: string) => {
        const list = new FakeMediaQueryList(query, query === matchingQuery);
        lists.push(list);
        return list;
    });
    return {
        lists,
        setMatches: (matches) => lists.forEach((list) => {
            list.matches = matches;
            list.dispatchEvent(Object.assign(new Event("change"), {matches}));
        }),
    };
}

describe("useIsDesktop", () => {
    it("queries the minimum desktop width", () => {
        stubMatchMedia(null);

        renderHook(() => useIsDesktop());

        expect(window.matchMedia).toHaveBeenCalledWith(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);
    });

    it("is true when the desktop query matches", () => {
        stubMatchMedia(`(min-width: ${MOBILE_BREAKPOINT_PX}px)`);

        const {result} = renderHook(() => useIsDesktop());

        expect(result.current).toBe(true);
    });

    it("is false when the desktop query does not match", () => {
        stubMatchMedia(null);

        const {result} = renderHook(() => useIsDesktop());

        expect(result.current).toBe(false);
    });

    it("follows viewport changes", () => {
        const mediaQuery = stubMatchMedia(null);
        const {result} = renderHook(() => useIsDesktop());

        act(() => { mediaQuery.setMatches(true); });
        expect(result.current).toBe(true);

        act(() => { mediaQuery.setMatches(false); });
        expect(result.current).toBe(false);
    });

    it("stops following viewport changes after unmount", () => {
        const mediaQuery = stubMatchMedia(null);
        const {result, unmount} = renderHook(() => useIsDesktop());
        unmount();

        act(() => { mediaQuery.setMatches(true); });

        expect(result.current).toBe(false);
    });
});

describe("useIsMobile", () => {
    it("queries the width just below the desktop breakpoint", () => {
        stubMatchMedia(null);

        renderHook(() => useIsMobile());

        expect(window.matchMedia).toHaveBeenCalledWith(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    });

    it("is true when the mobile query matches", () => {
        stubMatchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);

        const {result} = renderHook(() => useIsMobile());

        expect(result.current).toBe(true);
    });

    it("follows viewport changes", () => {
        const mediaQuery = stubMatchMedia(null);
        const {result} = renderHook(() => useIsMobile());

        act(() => { mediaQuery.setMatches(true); });

        expect(result.current).toBe(true);
    });
});
