import {vi} from "vitest";
import type {BillingSubscriptionDto} from "@/lib/billing-constants";

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function createBillingSubscriptionDto(overrides: Partial<BillingSubscriptionDto> = {}): BillingSubscriptionDto {
    return {
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + SUBSCRIPTION_PERIOD_MS).toISOString(),
        cancelAtPeriodEnd: false,
        ...overrides,
    };
}

/** Payment-provider origins the billing URLs in tests use. */
export const TEST_BILLING_ORIGINS = ["https://buy.polar.sh", "https://billing.polar.sh"] as const;

/** Puts the test origins on the billing allowlist (`NEXT_PUBLIC_BILLING_ORIGINS`); vitest unstubs it after each test. */
export function allowTestBillingOrigins(): void {
    vi.stubEnv("NEXT_PUBLIC_BILLING_ORIGINS", TEST_BILLING_ORIGINS.join(","));
}
