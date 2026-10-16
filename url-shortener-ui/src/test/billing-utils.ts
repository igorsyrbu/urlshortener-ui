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
