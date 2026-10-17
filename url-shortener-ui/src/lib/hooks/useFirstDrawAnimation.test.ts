import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useFirstDrawAnimation} from "@/lib/hooks/useFirstDrawAnimation";
import {stubDesktopViewport, stubReducedMotion} from "@/test/viewport-utils";

describe("useFirstDrawAnimation", () => {
    it("animates the chart's first draw", () => {
        stubDesktopViewport();

        const {result} = renderHook(() => useFirstDrawAnimation());

        expect(result.current.isAnimationActive).toBe(true);
    });

    it("stops animating once the first draw has finished, so later data swaps in place", () => {
        stubDesktopViewport();
        const {result} = renderHook(() => useFirstDrawAnimation());

        act(() => result.current.handleAnimationEnd());

        expect(result.current.isAnimationActive).toBe(false);
    });

    it("does not animate for users who prefer reduced motion", async () => {
        stubReducedMotion();

        const {result} = renderHook(() => useFirstDrawAnimation());

        await waitFor(() => expect(result.current.isAnimationActive).toBe(false));
    });
});
