import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {useBillingCheckout, type BillingCheckoutState} from "@/lib/hooks/useBillingCheckout";
import {allowTestBillingOrigins, TEST_BILLING_ORIGINS} from "@/test/billing-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const CHECKOUT_URL = `${TEST_BILLING_ORIGINS[0]}/checkout/abc`;

function dispatchPageShow(isPersisted: boolean): void {
    act(() => {
        window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted: isPersisted}));
    });
}

async function renderAfterCheckoutRedirect(): Promise<{current: BillingCheckoutState}> {
    const {result} = renderHook(() => useBillingCheckout("monthly", vi.fn()));
    await act(() => result.current.handleUpgrade());
    return result;
}

describe("useBillingCheckout after the checkout redirect", () => {
    beforeEach(() => {
        allowTestBillingOrigins();
        vi.stubGlobal("location", {assign: vi.fn()});
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json({url: CHECKOUT_URL}));
    });

    it("keeps redirecting while the browser leaves for the hosted checkout", async () => {
        const result = await renderAfterCheckoutRedirect();

        expect(window.location.assign).toHaveBeenCalledWith(CHECKOUT_URL);
        expect(result.current.isRedirecting).toBe(true);
    });

    it("re-enables the upgrade when Back restores the page from the back/forward cache", async () => {
        const result = await renderAfterCheckoutRedirect();

        dispatchPageShow(true);

        expect(result.current.isRedirecting).toBe(false);
    });

    it("stays redirecting on a regular page show", async () => {
        const result = await renderAfterCheckoutRedirect();

        dispatchPageShow(false);

        expect(result.current.isRedirecting).toBe(true);
    });
});

describe("useBillingCheckout after leaving the billing page", () => {
    beforeEach(() => {
        allowTestBillingOrigins();
        vi.stubGlobal("location", {assign: vi.fn()});
    });

    it("does not redirect when the checkout URL arrives after the page unmounted", async () => {
        let respond = (_response: Response): void => undefined;
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>((resolve) => { respond = resolve; }));
        const {result, unmount} = renderHook(() => useBillingCheckout("monthly", vi.fn()));

        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = result.current.handleUpgrade(); });
        unmount();
        await act(async () => {
            respond(Response.json({url: CHECKOUT_URL}));
            await pending;
        });

        expect(window.location.assign).not.toHaveBeenCalled();
        expect(vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal?.aborted).toBe(true);
    });
});
