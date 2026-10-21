import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {useBillingActionLock} from "@/lib/hooks/useBillingActionLock";

describe("useBillingActionLock", () => {
    it("runs only the first of two calls made in the same tick", async () => {
        const {result} = renderHook(() => useBillingActionLock());
        const first = vi.fn().mockResolvedValue(undefined);
        const second = vi.fn().mockResolvedValue(undefined);

        await act(() => Promise.all([result.current.run(first), result.current.run(second)]));

        expect(first).toHaveBeenCalledOnce();
        expect(second).not.toHaveBeenCalled();
    });

    it("is locked while an action runs and free again afterwards", async () => {
        const {result} = renderHook(() => useBillingActionLock());
        let finish = (): void => undefined;
        const pending = new Promise<void>((resolve) => { finish = resolve; });

        let running: Promise<void> = Promise.resolve();
        act(() => { running = result.current.run(() => pending); });
        expect(result.current.isLocked).toBe(true);

        await act(async () => { finish(); await running; });
        expect(result.current.isLocked).toBe(false);
    });

    it("unlocks after an action fails", async () => {
        const {result} = renderHook(() => useBillingActionLock());

        await act(() => result.current.run(() => Promise.reject(new Error("boom"))).catch(() => undefined));
        const next = vi.fn().mockResolvedValue(undefined);
        await act(() => result.current.run(next));

        expect(next).toHaveBeenCalledOnce();
    });
});
