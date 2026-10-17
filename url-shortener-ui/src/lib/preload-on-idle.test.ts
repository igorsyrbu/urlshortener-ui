import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {preloadOnIdle} from "@/lib/preload-on-idle";

describe("preloadOnIdle", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("waits for the browser to be idle before starting the downloads", () => {
        let runWhenIdle: IdleRequestCallback | undefined;
        vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
            runWhenIdle = callback;
            return 1;
        });
        const load = vi.fn(async () => undefined);

        preloadOnIdle([load]);
        expect(load).not.toHaveBeenCalled();
        runWhenIdle?.({didTimeout: false, timeRemaining: () => 50});

        expect(load).toHaveBeenCalledOnce();
    });

    it("falls back to a short timer where idle callbacks are not supported", () => {
        vi.stubGlobal("requestIdleCallback", undefined);
        const loadFirst = vi.fn(async () => undefined);
        const loadSecond = vi.fn(async () => undefined);

        preloadOnIdle([loadFirst, loadSecond]);
        expect(loadFirst).not.toHaveBeenCalled();
        vi.runAllTimers();

        expect(loadFirst).toHaveBeenCalledOnce();
        expect(loadSecond).toHaveBeenCalledOnce();
    });
});
