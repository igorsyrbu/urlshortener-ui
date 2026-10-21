export type BillingPeriod = "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
export type BillingScenario = "free" | "pro-monthly" | "pro-yearly" | "pro-pending" | "pro-canceling" | "trialing" | "past-due" | "canceled" | "expired";
export type PortalExpiryMode = "reported" | "omitted" | "invalid" | "expired";
export type PortalAction = "cancel-yearly-switch" | "cancel-subscription" | "resume-subscription" | "end-subscription";

export interface SubscriptionDto {
  plan: "FREE" | "PRO";
  status?: SubscriptionStatus;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  pendingBillingPeriod?: BillingPeriod;
  pendingAppliesAt?: string;
}

export interface BillingState {
  hasCustomer: boolean;
  billingPeriod: BillingPeriod;
  subscription: SubscriptionDto;
  portalExpiryMode: PortalExpiryMode;
}

export interface BillingSession {
  token: string;
  uuid: string;
  kind: "checkout" | "portal";
  expiresAtMs: number;
  billingPeriod?: BillingPeriod;
}

export const HTTP_OK = 200;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_GONE = 410;
export const HTTP_UNPROCESSABLE_ENTITY = 422;
export const HTTP_TOO_MANY_REQUESTS = 429;
export const HTTP_SEE_OTHER = 303;
export const SECOND_MS = 1_000;
export const RATE_LIMIT_WINDOW_MS = 60 * SECOND_MS;
export const BILLING_WRITE_RATE_LIMIT = 10;
export const BILLING_READ_RATE_LIMIT = 60;
export const BILLING_SESSION_TTL_MS = 60 * RATE_LIMIT_WINDOW_MS;
export const MONTHLY_PERIOD_MS = 30 * 24 * BILLING_SESSION_TTL_MS;
export const YEARLY_PERIOD_MS = 365 * 24 * BILLING_SESSION_TTL_MS;
/** Ten checkout and ten portal creations per minute with a one-hour TTL would keep ~1,200 sessions per user alive. */
export const MAX_LIVE_SESSIONS_PER_USER = 20;
export const BILLING_RETRY_AFTER_HEADER = "X-Rate-Limit-Retry-After-Seconds";
export const BILLING_SCENARIOS: readonly BillingScenario[] = ["free", "pro-monthly", "pro-yearly", "pro-pending", "pro-canceling", "trialing", "past-due", "canceled", "expired"];
export const PORTAL_EXPIRY_MODES: readonly PortalExpiryMode[] = ["reported", "omitted", "invalid", "expired"];
export const PORTAL_ACTIONS: readonly PortalAction[] = ["cancel-yearly-switch", "cancel-subscription", "resume-subscription", "end-subscription"];

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "MONTHLY" || value === "YEARLY";
}

export function isBillingScenario(value: unknown): value is BillingScenario {
  return BILLING_SCENARIOS.some((scenario) => scenario === value);
}

export function isPortalExpiryMode(value: unknown): value is PortalExpiryMode {
  return PORTAL_EXPIRY_MODES.some((mode) => mode === value);
}

export function isPortalAction(value: unknown): value is PortalAction {
  return PORTAL_ACTIONS.some((action) => action === value);
}
