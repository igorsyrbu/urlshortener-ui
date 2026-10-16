import {describe, expect, it} from "vitest";
import {
    buildRateLimitedMessage,
    isProSubscription,
    toBillingSubscription,
    type BillingSubscriptionDto,
} from "@/lib/billing-constants";

const FUTURE_PERIOD_END = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const PAST_PERIOD_END = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

describe("toBillingSubscription", () => {
    it("maps a FREE row without a status to the free plan", () => {
        expect(toBillingSubscription({plan: "FREE", cancelAtPeriodEnd: false})).toEqual({
            planId: "free",
            cancelAtPeriodEnd: false,
            pendingSwitch: null,
        });
    });

    it.each(["ACTIVE", "TRIALING"] as const)("maps a %s PRO row with a future period end to the pro plan", (status) => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status,
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: true,
        };

        expect(toBillingSubscription(dto)).toEqual({
            planId: "pro",
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: true,
            pendingSwitch: null,
        });
    });

    it.each(["PAST_DUE", "CANCELED", "EXPIRED"] as const)("maps a %s PRO row to the free plan", (status) => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status,
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: false,
        };

        expect(toBillingSubscription(dto).planId).toBe("free");
    });

    it("maps a PRO row with an expired period end to the free plan", () => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: PAST_PERIOD_END,
            cancelAtPeriodEnd: false,
        };

        expect(toBillingSubscription(dto).planId).toBe("free");
    });

    it("maps a PRO row without status or period end to the free plan", () => {
        expect(toBillingSubscription({plan: "PRO", cancelAtPeriodEnd: false}).planId).toBe("free");
    });

    it("maps a PRO row with an unparsable period end to the free plan", () => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: "not-a-date",
            cancelAtPeriodEnd: false,
        };

        expect(toBillingSubscription(dto).planId).toBe("free");
    });

    it("maps a scheduled yearly switch with its effective date", () => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: false,
            pendingBillingPeriod: "YEARLY",
            pendingAppliesAt: FUTURE_PERIOD_END,
        };

        expect(toBillingSubscription(dto).pendingSwitch).toEqual({effectiveDate: FUTURE_PERIOD_END});
    });

    it("maps a scheduled yearly switch without an effective date to a dateless switch", () => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: false,
            pendingBillingPeriod: "YEARLY",
        };

        expect(toBillingSubscription(dto).pendingSwitch).toEqual({effectiveDate: null});
    });

    it("maps a scheduled yearly switch with an unparsable date to a dateless switch", () => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: false,
            pendingBillingPeriod: "YEARLY",
            pendingAppliesAt: "not-a-date",
        };

        expect(toBillingSubscription(dto).pendingSwitch).toEqual({effectiveDate: null});
    });

    it("ignores a non-yearly pending period", () => {
        const dto: BillingSubscriptionDto = {
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodEnd: FUTURE_PERIOD_END,
            cancelAtPeriodEnd: false,
            pendingBillingPeriod: "MONTHLY",
            pendingAppliesAt: FUTURE_PERIOD_END,
        };

        expect(toBillingSubscription(dto).pendingSwitch).toBeNull();
    });

    it("ignores pending fields on a non-pro subscription", () => {
        const dto: BillingSubscriptionDto = {
            plan: "FREE",
            cancelAtPeriodEnd: false,
            pendingBillingPeriod: "YEARLY",
            pendingAppliesAt: FUTURE_PERIOD_END,
        };

        expect(toBillingSubscription(dto).pendingSwitch).toBeNull();
    });
});

describe("isProSubscription", () => {
    it("returns true only for the pro plan", () => {
        expect(isProSubscription({planId: "pro", cancelAtPeriodEnd: false, pendingSwitch: null})).toBe(true);
        expect(isProSubscription({planId: "free", cancelAtPeriodEnd: false, pendingSwitch: null})).toBe(false);
    });
});

describe("buildRateLimitedMessage", () => {
    it("appends the retry delay when provided", () => {
        expect(buildRateLimitedMessage("Slow down.", 45)).toBe("Slow down. Try again in 45s.");
    });

    it("returns the base message without a retry delay", () => {
        expect(buildRateLimitedMessage("Slow down.", null)).toBe("Slow down.");
    });
});
