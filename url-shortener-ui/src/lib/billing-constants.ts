export type BillingCycle = "monthly" | "yearly";
export type BillingPlanId = "free" | "pro";

export type BillingBackendPlan = "FREE" | "PRO";
export type BillingSubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface BillingSubscriptionDto {
    plan: BillingBackendPlan;
    status?: BillingSubscriptionStatus;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
    pendingBillingPeriod?: BillingPeriod;
    pendingAppliesAt?: string;
}

export interface BillingPeriodUpgradeResponse {
    status: "scheduled";
    effectiveDate?: string;
}

export interface ScheduledPeriodSwitch {
    effectiveDate: string | null;
}

export interface BillingSubscription {
    planId: BillingPlanId;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd: boolean;
    pendingSwitch: ScheduledPeriodSwitch | null;
}

export interface BillingPlan {
    id: BillingPlanId;
    name: string;
    description?: string;
    features: readonly string[];
}

interface BillingPrice {
    monthlyPrice: string;
    description: string;
    checkoutSummary: string;
}

export const BILLING_COPY = {
    TITLE: "Billing",
    DESCRIPTION: "Choose a plan and manage your subscription.",
    CYCLE_LABEL: "Billing cycle",
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
    SAVINGS: "Save 17%",
    CURRENT_PLAN: "Current plan",
    CURRENCY_SYMBOL: "$",
    FREE_PRICE: "$0",
    FREE_DESCRIPTION: "Free forever",
    PRICE_PERIOD: "/month",
    UPGRADE: "Upgrade to Pro",
    UPGRADING: "Redirecting…",
    RETRY: "Retry",
    SUBSCRIPTION_LOADING: "Loading subscription…",
    SUBSCRIPTION_LOAD_ERROR: "Unable to load your subscription. Please try again.",
    ALREADY_PRO: "You're already on Pro.",
    CHECKOUT_INVALID_PERIOD: "Invalid billing period. Please try again.",
    CHECKOUT_RATE_LIMITED: "Too many checkout attempts. Please try again shortly.",
    CHECKOUT_FAILED: "Unable to start checkout. Please try again.",
    MANAGE_SUBSCRIPTION: "Manage subscription",
    MANAGING_SUBSCRIPTION: "Opening portal…",
    SWITCH_TO_YEARLY: "Switch to yearly",
    SWITCHING_PERIOD: "Switching…",
    SWITCH_CONFIRM_TITLE: "Switch to annual billing?",
    SWITCH_CONFIRM_DESCRIPTION: "Your plan will move to annual billing at your next renewal date. No changes will be made to your current billing period.",
    SWITCH_CONFIRM_NOTE: "You can change your billing cycle at any time in the customer portal via Manage subscription.",
    SWITCH_CONFIRM_BUTTON: "Confirm",
    SWITCHES_TO_YEARLY_ON: "Switches to yearly billing on",
    SWITCHES_TO_YEARLY_AT_RENEWAL: "Switches to yearly billing at your next renewal",
    PERIOD_UPGRADE_NOT_FOUND: "Your subscription couldn't be found.",
    PERIOD_UPGRADE_NOT_ELIGIBLE: "Your subscription can't be switched to yearly billing right now.",
    PERIOD_UPGRADE_RATE_LIMITED: "Too many switch attempts. Please try again shortly.",
    PERIOD_UPGRADE_FAILED: "Unable to switch billing period. Please try again.",
    PORTAL_NO_HISTORY: "No billing history yet. Upgrade to Pro to manage your subscription.",
    PORTAL_RATE_LIMITED: "Too many portal requests. Please try again shortly.",
    PORTAL_FAILED: "Unable to open the billing portal. Please try again.",
    RENEWS_ON: "Renews on",
    CANCELS_ON: "Cancels on",
    UPGRADE_LOG_ERROR: "Failed to start billing checkout",
    PERIOD_UPGRADE_LOG_ERROR: "Failed to switch billing period",
    PORTAL_LOG_ERROR: "Failed to open billing portal",
    SUBSCRIPTION_LOG_ERROR: "Failed to load billing subscription",
};

export const BILLING_PRICES: Record<BillingCycle, BillingPrice> = {
    monthly: {monthlyPrice: "$9.99", description: "Billed monthly", checkoutSummary: "$9.99 per month, billed monthly"},
    yearly: {monthlyPrice: "$8.33", description: "Billed yearly ($99.99/year)", checkoutSummary: "$99.99 per year ($8.33 per month), billed yearly"},
};

export const BILLING_PLANS: readonly BillingPlan[] = [
    {
        id: "free",
        name: "Free",
        features: [
            "50 short links",
            "5,000 tracked clicks a month",
            "30 days of analytics",
            "Tracker detection and auto-clean",
            "Community support",
        ],
    },
    {
        id: "pro",
        name: "Pro",
        description: "Everything in Free, plus",
        features: [
            "Unlimited short links",
            "250,000 tracked clicks a month",
            "12 months of analytics",
            "Up to 3 custom domains",
            "Password-protected and expiring links",
            "API access and bulk import",
        ],
    },
];

export const FREE_BILLING_SUBSCRIPTION: BillingSubscription = {planId: "free", cancelAtPeriodEnd: false, pendingSwitch: null};

export const BILLING_PERIOD_BY_CYCLE: Record<BillingCycle, BillingPeriod> = {
    monthly: "MONTHLY",
    yearly: "YEARLY",
};

export const RATE_LIMIT_RETRY_AFTER_HEADER = "X-Rate-Limit-Retry-After-Seconds";

const ACTIVE_SUBSCRIPTION_STATUSES: readonly BillingSubscriptionStatus[] = ["ACTIVE", "TRIALING"];

function hasFuturePeriodEnd(currentPeriodEnd: string | undefined): boolean {
    if (!currentPeriodEnd) return false;
    const periodEnd = Date.parse(currentPeriodEnd);
    if (Number.isNaN(periodEnd)) return false;
    return periodEnd > Date.now();
}

function toPendingSwitch(dto: BillingSubscriptionDto): ScheduledPeriodSwitch | null {
    if (dto.pendingBillingPeriod !== "YEARLY") return null;
    if (dto.pendingAppliesAt === undefined) return {effectiveDate: null};
    return Number.isNaN(Date.parse(dto.pendingAppliesAt)) ? {effectiveDate: null} : {effectiveDate: dto.pendingAppliesAt};
}

export function toBillingSubscription(dto: BillingSubscriptionDto): BillingSubscription {
    if (dto.plan !== "PRO") return {planId: "free", cancelAtPeriodEnd: dto.cancelAtPeriodEnd, pendingSwitch: null};
    if (dto.status === undefined || !ACTIVE_SUBSCRIPTION_STATUSES.includes(dto.status)) {
        return {planId: "free", cancelAtPeriodEnd: dto.cancelAtPeriodEnd, pendingSwitch: null};
    }
    if (!hasFuturePeriodEnd(dto.currentPeriodEnd)) {
        return {planId: "free", cancelAtPeriodEnd: dto.cancelAtPeriodEnd, pendingSwitch: null};
    }
    return {planId: "pro", currentPeriodEnd: dto.currentPeriodEnd, cancelAtPeriodEnd: dto.cancelAtPeriodEnd, pendingSwitch: toPendingSwitch(dto)};
}

export function isProSubscription(subscription: BillingSubscription): boolean {
    return subscription.planId === "pro";
}

export function buildRateLimitedMessage(baseMessage: string, retryAfterSeconds: number | null): string {
    if (retryAfterSeconds === null) return baseMessage;
    return `${baseMessage} Try again in ${retryAfterSeconds}s.`;
}
