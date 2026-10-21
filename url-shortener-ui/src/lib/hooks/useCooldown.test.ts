import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useCooldown} from "@/lib/hooks/useCooldown";

describe("useCooldown", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("pauses for the given seconds and then ends by itself", () => {
        const {result} = renderHook(() => useCooldown());

        act(() => result.current.startCooldown(30));
        expect(result.current.isCoolingDown).toBe(true);
        act(() => { vi.advanceTimersByTime(29_999); });
        expect(result.current.isCoolingDown).toBe(true);
        act(() => { vi.advanceTimersByTime(1); });

        expect(result.current.isCoolingDown).toBe(false);
    });

    it.each([null, 0, -5])("starts no pause for a delay of %s", (seconds) => {
        const {result} = renderHook(() => useCooldown());

        act(() => result.current.startCooldown(seconds));

        expect(result.current.isCoolingDown).toBe(false);
    });
});
