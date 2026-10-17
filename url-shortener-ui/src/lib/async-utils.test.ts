import {describe, expect, it, vi} from "vitest";
import {attempt, withPending} from "@/lib/async-utils";

describe("withPending", () => {
    it("is pending while the task runs and not after it succeeds", async () => {
        const setPending = vi.fn<(isPending: boolean) => void>();
        let wasPendingDuringTask = false;

        await withPending(setPending, async () => {
            wasPendingDuringTask = setPending.mock.lastCall?.[0] === true;
        });

        expect(wasPendingDuringTask).toBe(true);
        expect(setPending).toHaveBeenLastCalledWith(false);
    });

    it("clears the pending flag and passes the failure on when the task fails", async () => {
        const setPending = vi.fn<(isPending: boolean) => void>();
        const failure = new Error("boom");

        await expect(withPending(setPending, async () => {
            throw failure;
        })).rejects.toBe(failure);

        expect(setPending.mock.calls).toEqual([[true], [false]]);
    });
});

describe("attempt", () => {
    it("returns the value of a task that succeeds", async () => {
        await expect(attempt(async () => 42)).resolves.toEqual({isSuccess: true, value: 42});
    });

    it("returns the error of a task that fails instead of throwing", async () => {
        const failure = new Error("boom");

        await expect(attempt(async () => {
            throw failure;
        })).resolves.toEqual({isSuccess: false, error: failure});
    });
});
