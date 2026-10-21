import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {useBillingPeriodUpgrade} from "@/lib/hooks/useBillingPeriodUpgrade";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

describe("useBillingPeriodUpgrade after leaving the billing page", () => {
    it("reports nothing when the switch is confirmed after the page unmounted", async () => {
        let respond = (_response: Response): void => undefined;
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>((resolve) => { respond = resolve; }));
        const onScheduled = vi.fn();
        const {result, unmount} = renderHook(() => useBillingPeriodUpgrade(vi.fn(), onScheduled));

        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = result.current.handleSwitch(); });
        unmount();
        await act(async () => {
            respond(Response.json({status: "scheduled"}));
            await pending;
        });

        expect(onScheduled).not.toHaveBeenCalled();
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal?.aborted).toBe(true);
    });
});
