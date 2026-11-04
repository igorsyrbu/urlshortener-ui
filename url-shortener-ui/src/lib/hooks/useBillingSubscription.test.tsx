import {StrictMode, type ReactNode} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {BILLING_COPY, RATE_LIMIT_RETRY_AFTER_HEADER, type BillingSubscriptionDto} from "@/lib/billing-constants";
import {API_ENDPOINTS} from "@/lib/constants";
import {useBillingSubscription} from "@/lib/hooks/useBillingSubscription";
import {HTTP_INTERNAL_SERVER_ERROR, HTTP_TOO_MANY_REQUESTS, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {logger} from "@/lib/logger";
import {createBillingSubscriptionDto} from "@/test/billing-utils";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const PRO_SUBSCRIPTION: BillingSubscriptionDto = createBillingSubscriptionDto();

function renderSubscription() {
    const queryClient = createTestQueryClient();
    function Providers({children}: {children: ReactNode}) {
        return <StrictMode><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></StrictMode>;
    }
    return renderHook(() => useBillingSubscription(), {wrapper: Providers});
}

function subscriptionRequests(): number {
    return vi.mocked(fetchWithAuth).mock.calls.filter(([url]) => url === API_ENDPOINTS.BILLING_SUBSCRIPTION).length;
}

function returnToTab(): void {
    act(() => {
        document.dispatchEvent(new Event("visibilitychange", {bubbles: true}));
    });
}

describe("useBillingSubscription", () => {
    beforeEach(() => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json(PRO_SUBSCRIPTION));
    });

    it("loads the subscription once, also when Strict Mode mounts twice", async () => {
        const {result} = renderSubscription();

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.subscription.planId).toBe("pro");
        expect(subscriptionRequests()).toBe(1);
    });

    it("reloads when the tab becomes visible again, so portal changes show on return", async () => {
        const {result} = renderSubscription();
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json({...PRO_SUBSCRIPTION, cancelAtPeriodEnd: true}));

        returnToTab();

        await waitFor(() => expect(result.current.subscription.cancelAtPeriodEnd).toBe(true));
        expect(result.current.isLoading).toBe(false);
    });

    it("does not reload on a window focus alone", async () => {
        const {result} = renderSubscription();
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => {
            window.dispatchEvent(new FocusEvent("focus"));
        });

        expect(subscriptionRequests()).toBe(1);
    });

    it("keeps the subscription without an error and logs when a reload fails", async () => {
        const {result} = renderSubscription();
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));

        returnToTab();

        await waitFor(() => expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, expect.anything()));
        expect(result.current).toMatchObject({subscription: {planId: "pro"}, isLoading: false, errorMessage: null});
    });

    it("reports a failed first load and loads again on retry", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));
        const {result} = renderSubscription();
        await waitFor(() => expect(result.current.errorMessage).toBe(BILLING_COPY.SUBSCRIPTION_LOAD_ERROR));
        const retried = Promise.withResolvers<Response>();
        vi.mocked(fetchWithAuth).mockReturnValue(retried.promise);

        act(() => result.current.handleRetry());

        await waitFor(() => expect(result.current).toMatchObject({isLoading: true, errorMessage: null}));
        retried.resolve(Response.json(PRO_SUBSCRIPTION));
        await waitFor(() => expect(result.current.subscription.planId).toBe("pro"));
    });

    it("says a first load was rate limited and holds Retry for the delay", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null, {
            status: HTTP_TOO_MANY_REQUESTS, headers: {[RATE_LIMIT_RETRY_AFTER_HEADER]: "30"},
        }));

        const {result} = renderSubscription();

        await waitFor(() => expect(result.current.isRetryCoolingDown).toBe(true));
        expect(result.current.errorMessage).toContain("30");
        expect(subscriptionRequests()).toBe(1);
    });

    it("keeps loading without an error or a log while a 401 sends the user to sign in", async () => {
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null, {status: HTTP_UNAUTHORIZED}));

        const {result} = renderSubscription();

        await waitFor(() => expect(subscriptionRequests()).toBe(1));
        await act(async () => undefined);
        expect(result.current).toMatchObject({isLoading: true, errorMessage: null});
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("shows a switch the server just scheduled without asking for the subscription again", async () => {
        const {result} = renderSubscription();
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.showScheduledSwitch({effectiveDate: "2026-12-01"}));

        await waitFor(() => expect(result.current.subscription.pendingSwitch).toEqual({effectiveDate: "2026-12-01"}));
        expect(subscriptionRequests()).toBe(1);
    });

    it("reloads in the background when an action learned that the plan changed", async () => {
        const {result} = renderSubscription();
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json({...PRO_SUBSCRIPTION, cancelAtPeriodEnd: true}));

        act(() => result.current.refreshSubscription());

        expect(result.current.isLoading).toBe(false);
        await waitFor(() => expect(result.current.subscription.cancelAtPeriodEnd).toBe(true));
    });
});
