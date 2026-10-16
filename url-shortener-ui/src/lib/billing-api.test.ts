import {describe, expect, it, vi, beforeEach} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {RATE_LIMIT_RETRY_AFTER_HEADER} from "@/lib/billing-constants";
import {
    BillingApiError,
    createBillingCheckoutUrl,
    createBillingPortalUrl,
    getBillingSubscription,
    scheduleBillingPeriodUpgrade,
} from "@/lib/billing-api";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const CHECKOUT_URL = "https://buy.polar.sh/checkout/abc";
const PORTAL_URL = "https://billing.polar.sh/portal/abc";
const FUTURE_PERIOD_END = "2026-11-08T22:24:30Z";
const PORTAL_TTL_SECONDS = 60 * 60;

function rateLimitedResponse(retryAfterSeconds: string | null): Response {
    const headers = retryAfterSeconds === null ? undefined : {[RATE_LIMIT_RETRY_AFTER_HEADER]: retryAfterSeconds};
    return new Response(JSON.stringify({detail: "Request rate limit exceeded."}), {status: 429, headers});
}

beforeEach(() => {
    vi.mocked(fetchWithAuth).mockReset();
});

describe("getBillingSubscription", () => {
    it("maps a FREE row to the free plan", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({plan: "FREE", cancelAtPeriodEnd: false}));

        const subscription = await getBillingSubscription();

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.BILLING_SUBSCRIPTION);
        expect(subscription).toEqual({planId: "free", cancelAtPeriodEnd: false, pendingSwitch: null});
    });

    it("maps an ACTIVE PRO row with a future period end to the pro plan", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: false,
        }));

        const subscription = await getBillingSubscription();

        expect(subscription.planId).toBe("pro");
        expect(subscription.currentPeriodEnd).toBe(FUTURE_PERIOD_END);
    });

    it("throws a BillingApiError with the retry delay on rate limiting", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(rateLimitedResponse("45"));

        const failure = await getBillingSubscription().catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BillingApiError);
        expect((failure as BillingApiError).status).toBe(429);
        expect((failure as BillingApiError).retryAfterSeconds).toBe(45);
    });
});

describe("createBillingCheckoutUrl", () => {
    it.each([
        {cycle: "monthly" as const, billingPeriod: "MONTHLY"},
        {cycle: "yearly" as const, billingPeriod: "YEARLY"},
    ])("posts $billingPeriod and returns the checkout URL for $cycle billing", async ({cycle, billingPeriod}) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: CHECKOUT_URL}));

        const url = await createBillingCheckoutUrl(cycle);

        expect(url).toBe(CHECKOUT_URL);
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(
            API_ENDPOINTS.BILLING_CHECKOUT,
            expect.objectContaining({method: "POST"}),
        );
        const [, init] = vi.mocked(fetchWithAuth).mock.calls[0];
        expect(JSON.parse(String(init?.body))).toEqual({billingPeriod});
    });

    it("throws a 409 BillingApiError when already Pro", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 409}));

        const failure = await createBillingCheckoutUrl("monthly").catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BillingApiError);
        expect((failure as BillingApiError).status).toBe(409);
    });

    it("throws a 400 BillingApiError for a missing billing period", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 400}));

        const failure = await createBillingCheckoutUrl("monthly").catch((error: unknown) => error);

        expect((failure as BillingApiError).status).toBe(400);
    });

    it("rejects when the checkout payload has no URL", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: ""}));

        await expect(createBillingCheckoutUrl("monthly")).rejects.toThrow();
    });
});

describe("createBillingPortalUrl", () => {
    it("posts without a body and returns the portal URL with its expiry", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: PORTAL_URL, expiresInSeconds: PORTAL_TTL_SECONDS}));

        const result = await createBillingPortalUrl();

        expect(result).toEqual({url: PORTAL_URL, expiresInSeconds: PORTAL_TTL_SECONDS});
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(
            API_ENDPOINTS.BILLING_PORTAL,
            expect.objectContaining({method: "POST"}),
        );
        const [, request] = vi.mocked(fetchWithAuth).mock.calls[0];
        expect(request?.body).toBeUndefined();
    });

    it("returns a null expiry when the provider omits it", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: PORTAL_URL}));

        const result = await createBillingPortalUrl();

        expect(result).toEqual({url: PORTAL_URL, expiresInSeconds: null});
    });

    it.each([
        {expiresInSeconds: -5},
        {expiresInSeconds: 1.5},
        {expiresInSeconds: "3600"},
        {expiresInSeconds: Number.MAX_VALUE},
    ])("returns a null expiry for an invalid countdown $expiresInSeconds", async ({expiresInSeconds}) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: PORTAL_URL, expiresInSeconds}));

        const result = await createBillingPortalUrl();

        expect(result).toEqual({url: PORTAL_URL, expiresInSeconds: null});
    });

    it("preserves a zero remaining lifetime as expired", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: PORTAL_URL, expiresInSeconds: 0}));

        const result = await createBillingPortalUrl();

        expect(result).toEqual({url: PORTAL_URL, expiresInSeconds: 0});
    });

    it("returns a null expiry when the provider explicitly reports null", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({url: PORTAL_URL, expiresInSeconds: null}));

        const result = await createBillingPortalUrl();

        expect(result).toEqual({url: PORTAL_URL, expiresInSeconds: null});
    });

    it("throws a 404 BillingApiError when never a Polar customer", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 404}));

        const failure = await createBillingPortalUrl().catch((error: unknown) => error);

        expect((failure as BillingApiError).status).toBe(404);
    });

    it("throws a 500 BillingApiError on provider failure", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        const failure = await createBillingPortalUrl().catch((error: unknown) => error);

        expect((failure as BillingApiError).status).toBe(500);
    });
});

describe("scheduleBillingPeriodUpgrade", () => {
    it("posts without a body and returns the scheduled switch with its effective date", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({status: "scheduled", effectiveDate: FUTURE_PERIOD_END}));

        const response = await scheduleBillingPeriodUpgrade();

        expect(response).toEqual({status: "scheduled", effectiveDate: FUTURE_PERIOD_END});
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(
            API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE,
            expect.objectContaining({method: "POST"}),
        );
        const [, init] = vi.mocked(fetchWithAuth).mock.calls[0];
        expect(init?.body).toBeUndefined();
    });

    it("returns a dateless scheduled switch when the provider reports no pending date", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({status: "scheduled"}));

        const response = await scheduleBillingPeriodUpgrade();

        expect(response).toEqual({status: "scheduled"});
    });

    it.each([404, 409, 422, 500])("throws a %i BillingApiError", async (status) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status}));

        const failure = await scheduleBillingPeriodUpgrade().catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BillingApiError);
        expect((failure as BillingApiError).status).toBe(status);
    });

    it("throws a 429 BillingApiError with the retry delay", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(rateLimitedResponse("20"));

        const failure = await scheduleBillingPeriodUpgrade().catch((error: unknown) => error);

        expect((failure as BillingApiError).status).toBe(429);
        expect((failure as BillingApiError).retryAfterSeconds).toBe(20);
    });

    it("rejects a success payload with an unexpected status", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({status: "active"}));

        await expect(scheduleBillingPeriodUpgrade()).rejects.toThrow();
    });
});
