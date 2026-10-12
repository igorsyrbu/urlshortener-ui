import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useDebounce} from "@/lib/hooks/useDebounce";

const DELAY_MS = 300;

describe("useDebounce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns the initial value immediately", () => {
        const {result} = renderHook(() => useDebounce("first", DELAY_MS));

        expect(result.current).toBe("first");
    });

    it("publishes a new value only after the delay elapsed", () => {
        const {result, rerender} = renderHook(({value}) => useDebounce(value, DELAY_MS), {initialProps: {value: "first"}});

        rerender({value: "second"});
        act(() => { vi.advanceTimersByTime(DELAY_MS - 1); });
        expect(result.current).toBe("first");

        act(() => { vi.advanceTimersByTime(1); });
        expect(result.current).toBe("second");
    });

    it("restarts the delay on every change and publishes only the latest value", () => {
        const {result, rerender} = renderHook(({value}) => useDebounce(value, DELAY_MS), {initialProps: {value: "a"}});

        rerender({value: "ab"});
        act(() => { vi.advanceTimersByTime(DELAY_MS - 1); });
        rerender({value: "abc"});
        act(() => { vi.advanceTimersByTime(DELAY_MS - 1); });
        expect(result.current).toBe("a");

        act(() => { vi.advanceTimersByTime(1); });
        expect(result.current).toBe("abc");
    });

    it("applies a changed delay to the pending value", () => {
        const {result, rerender} = renderHook(
            ({value, delay}) => useDebounce(value, delay),
            {initialProps: {value: "a", delay: DELAY_MS}},
        );

        rerender({value: "b", delay: DELAY_MS * 2});
        act(() => { vi.advanceTimersByTime(DELAY_MS); });
        expect(result.current).toBe("a");

        act(() => { vi.advanceTimersByTime(DELAY_MS); });
        expect(result.current).toBe("b");
    });

    it("leaves no pending timer after unmount", () => {
        const {rerender, unmount} = renderHook(({value}) => useDebounce(value, DELAY_MS), {initialProps: {value: "a"}});
        rerender({value: "b"});

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
