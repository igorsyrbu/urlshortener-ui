import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useCoalescedCallback} from "@/lib/hooks/useCoalescedCallback";

const FRAME_MS = 16;
const WAIT_MS = 250;

describe("useCoalescedCallback", () => {
    beforeEach(() => {
        vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"]});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("passes only the latest value of a burst to the callback, once per frame", () => {
        const callback = vi.fn();
        const {result} = renderHook(() => useCoalescedCallback(callback));

        act(() => {
            result.current.schedule("#111111");
            result.current.schedule("#222222");
            result.current.schedule("#333333");
        });
        expect(callback).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(FRAME_MS));

        expect(callback).toHaveBeenCalledExactlyOnceWith("#333333");
    });

    it("waits for a pause when a wait is given", () => {
        const callback = vi.fn();
        const {result} = renderHook(() => useCoalescedCallback(callback, WAIT_MS));

        act(() => result.current.schedule(1));
        act(() => vi.advanceTimersByTime(WAIT_MS - 1));
        act(() => result.current.schedule(2));
        act(() => vi.advanceTimersByTime(WAIT_MS - 1));
        expect(callback).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(1));

        expect(callback).toHaveBeenCalledExactlyOnceWith(2);
    });

    it("runs a queued call at once on flush and not again later", () => {
        const callback = vi.fn();
        const {result} = renderHook(() => useCoalescedCallback(callback, WAIT_MS));

        act(() => result.current.schedule("saved"));
        act(() => result.current.flush());
        act(() => vi.advanceTimersByTime(WAIT_MS));

        expect(callback).toHaveBeenCalledExactlyOnceWith("saved");
    });

    it("runs a queued call when the component unmounts, so the last change is not lost", () => {
        const callback = vi.fn();
        const {result, unmount} = renderHook(() => useCoalescedCallback(callback, WAIT_MS));

        act(() => result.current.schedule("last"));
        unmount();

        expect(callback).toHaveBeenCalledExactlyOnceWith("last");
    });

    it("calls the newest callback", () => {
        const first = vi.fn();
        const second = vi.fn();
        const {result, rerender} = renderHook(({callback}) => useCoalescedCallback(callback), {initialProps: {callback: first}});

        act(() => result.current.schedule("x"));
        rerender({callback: second});
        act(() => vi.advanceTimersByTime(FRAME_MS));

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledExactlyOnceWith("x");
    });
});
