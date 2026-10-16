import {StrictMode} from "react";
import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {BILLING_COPY, type BillingSubscriptionDto} from "@/lib/billing-constants";
import {API_ENDPOINTS} from "@/lib/constants";
import {useBillingSubscription} from "@/lib/hooks/useBillingSubscription";
import {logger} from "@/lib/logger";
import {createBillingSubscriptionDto} from "@/test/billing-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const HTTP_INTERNAL_SERVER_ERROR = 500;
const PRO_SUBSCRIPTION: BillingSubscriptionDto = createBillingSubscriptionDto();

describe("useBillingSubscription silent refresh", () => {
    beforeEach(() => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json(PRO_SUBSCRIPTION));
    });

    it("applies portal changes after Strict Mode remounts effects", async () => {
        const {result} = renderHook(() => useBillingSubscription(), {wrapper: StrictMode});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({...PRO_SUBSCRIPTION, cancelAtPeriodEnd: true}));

        await act(async () => {
            expect(await result.current.refreshSilently()).toBe(true);
        });

        expect(result.current.subscription.cancelAtPeriodEnd).toBe(true);
        expect(fetchWithAuth).toHaveBeenLastCalledWith(API_ENDPOINTS.BILLING_SUBSCRIPTION);
    });

    it("keeps subscription content available while a silent refresh is pending", async () => {
        const {result} = renderHook(() => useBillingSubscription());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const refreshedResponse = Promise.withResolvers<Response>();
        vi.mocked(fetchWithAuth).mockReturnValueOnce(refreshedResponse.promise);
        let refreshResult: Promise<boolean> | undefined;

        act(() => {
            refreshResult = result.current.refreshSilently();
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.subscription.planId).toBe("pro");
        expect(result.current.errorMessage).toBeNull();

        await act(async () => {
            refreshedResponse.resolve(Response.json({...PRO_SUBSCRIPTION, cancelAtPeriodEnd: true}));
            expect(await refreshResult).toBe(true);
        });
        expect(result.current.isLoading).toBe(false);
        expect(result.current.subscription.cancelAtPeriodEnd).toBe(true);
    });

    it("logs a failed silent refresh and preserves the current subscription", async () => {
        const {result} = renderHook(() => useBillingSubscription());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const currentSubscription = result.current.subscription;
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

        await act(async () => {
            expect(await result.current.refreshSilently()).toBe(false);
        });

        expect(result.current.subscription).toEqual(currentSubscription);
        expect(result.current.errorMessage).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, expect.any(Error));
    });

    it("discards a silent refresh response when the hook unmounts", async () => {
        const {result, unmount} = renderHook(() => useBillingSubscription());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const currentSubscription = result.current.subscription;
        const refreshedResponse = Promise.withResolvers<Response>();
        vi.mocked(fetchWithAuth).mockReturnValueOnce(refreshedResponse.promise);
        const refreshResult = result.current.refreshSilently();

        unmount();
        refreshedResponse.resolve(Response.json({...PRO_SUBSCRIPTION, cancelAtPeriodEnd: true}));

        expect(await refreshResult).toBe(false);
        expect(result.current.subscription).toEqual(currentSubscription);
    });
});
