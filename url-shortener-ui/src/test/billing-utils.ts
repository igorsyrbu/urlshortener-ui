import {vi, type Mock} from "vitest";
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

export interface FakeBillingTab {
    tab: Window;
    replaceLocation: Mock<(url: string) => void>;
    close: Mock<() => void>;
}

/** A tab as returned by `window.open`, with spies on the members the billing code uses. */
export function createFakeBillingTab(): FakeBillingTab {
    const replaceLocation = vi.fn<(url: string) => void>();
    const close = vi.fn<() => void>();
    // jsdom cannot open a real window; the billing code only touches these members of the returned tab.
    const tab = {
        opener: window,
        document: document.implementation.createHTMLDocument(),
        location: {replace: replaceLocation},
        close,
    } as unknown as Window;
    return {tab, replaceLocation, close};
}
