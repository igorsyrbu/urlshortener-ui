import { randomUUID } from "node:crypto";
import type { BillingDefaults } from "../config";
import {
  BILLING_SESSION_TTL_MS, HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_UNPROCESSABLE_ENTITY,
  MONTHLY_PERIOD_MS, YEARLY_PERIOD_MS,
  type BillingPeriod, type BillingScenario, type BillingSession, type BillingState,
  type PortalAction, type PortalExpiryMode, type SubscriptionDto,
} from "./billing-constants";

export class BillingError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "BillingError";
  }
}

export class BillingService {
  private states = new Map<string, BillingState>();
  private sessions = new Map<string, BillingSession>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly defaults: BillingDefaults = { scenario: "free", portalExpiry: "reported" },
  ) {}

  getState(uuid: string): BillingState {
    const existing = this.states.get(uuid);
    if (existing) return existing;
    return this.setScenario(uuid, this.defaults.scenario);
  }

  getSubscription(uuid: string): SubscriptionDto {
    const subscription = this.getState(uuid).subscription;
    return { ...subscription, plan: this.isEntitled(subscription) ? "PRO" : "FREE" };
  }

  setScenario(uuid: string, scenario: BillingScenario, expiryMode?: PortalExpiryMode): BillingState {
    const state = this.createScenario(scenario);
    state.portalExpiryMode = expiryMode ?? this.defaults.portalExpiry;
    this.states.set(uuid, state);
    this.invalidateSessions(uuid);
    return state;
  }

  createCheckout(uuid: string, billingPeriod: BillingPeriod): BillingSession {
    if (this.isEntitled(this.getState(uuid).subscription)) {
      throw new BillingError(HTTP_CONFLICT, "The user already has an active Pro subscription.");
    }
    return this.createSession(uuid, "checkout", billingPeriod);
  }

  createPortal(uuid: string): BillingSession {
    if (!this.getState(uuid).hasCustomer) {
      throw new BillingError(HTTP_NOT_FOUND, "No billing customer exists for this user.");
    }
    return this.createSession(uuid, "portal");
  }

  getSession(token: string, kind: BillingSession["kind"]): BillingSession | null {
    const session = this.sessions.get(token);
    if (!session || session.kind !== kind) return null;
    if (session.expiresAtMs <= this.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  completeCheckout(session: BillingSession): void {
    const billingPeriod = session.billingPeriod ?? "MONTHLY";
    if (this.isEntitled(this.getState(session.uuid).subscription)) {
      throw new BillingError(HTTP_CONFLICT, "The user already has an active Pro subscription.");
    }
    this.setScenario(session.uuid, billingPeriod === "YEARLY" ? "pro-yearly" : "pro-monthly");
    this.sessions.delete(session.token);
  }

  scheduleYearlyUpgrade(uuid: string): { status: "scheduled"; effectiveDate?: string } {
    const state = this.getState(uuid);
    const subscription = state.subscription;
    if (!state.hasCustomer || subscription.status === undefined) {
      throw new BillingError(HTTP_NOT_FOUND, "No subscription exists for this user.");
    }
    if (state.billingPeriod === "YEARLY" || subscription.pendingBillingPeriod || subscription.cancelAtPeriodEnd) {
      throw new BillingError(HTTP_CONFLICT, "The subscription has a conflicting billing change.");
    }
    if (!this.isEntitled(subscription)) {
      throw new BillingError(HTTP_UNPROCESSABLE_ENTITY, "The subscription is not actively monthly.");
    }
    subscription.pendingBillingPeriod = "YEARLY";
    subscription.pendingAppliesAt = subscription.currentPeriodEnd;
    return { status: "scheduled", effectiveDate: subscription.pendingAppliesAt };
  }

  applyPortalAction(uuid: string, action: PortalAction): void {
    const subscription = this.getState(uuid).subscription;
    if (action === "cancel-yearly-switch") {
      this.clearPendingSwitch(subscription);
      return;
    }
    if (!this.isEntitled(subscription)) {
      throw new BillingError(HTTP_CONFLICT, "There is no active subscription to update.");
    }
    subscription.cancelAtPeriodEnd = action === "cancel-subscription";
    if (action === "end-subscription") subscription.status = "CANCELED";
    if (action !== "resume-subscription") this.clearPendingSwitch(subscription);
  }

  private isEntitled(subscription: SubscriptionDto): boolean {
    const isActive = subscription.status === "ACTIVE" || subscription.status === "TRIALING";
    const periodEnd = Date.parse(subscription.currentPeriodEnd ?? "");
    return isActive && periodEnd > this.now();
  }

  private createScenario(scenario: BillingScenario): BillingState {
    const isYearly = scenario === "pro-yearly";
    const subscription: SubscriptionDto = {
      plan: scenario === "free" ? "FREE" : "PRO",
      cancelAtPeriodEnd: scenario === "pro-canceling",
    };
    if (scenario !== "free") {
      subscription.status = this.scenarioStatus(scenario);
      const duration = isYearly ? YEARLY_PERIOD_MS : MONTHLY_PERIOD_MS;
      subscription.currentPeriodEnd = new Date(this.now() + (scenario === "expired" ? -duration : duration)).toISOString();
    }
    if (scenario === "pro-pending") {
      subscription.pendingBillingPeriod = "YEARLY";
      subscription.pendingAppliesAt = subscription.currentPeriodEnd;
    }
    return { hasCustomer: scenario !== "free", billingPeriod: isYearly ? "YEARLY" : "MONTHLY", subscription, portalExpiryMode: "reported" };
  }

  private scenarioStatus(scenario: BillingScenario): NonNullable<SubscriptionDto["status"]> {
    if (scenario === "trialing") return "TRIALING";
    if (scenario === "past-due") return "PAST_DUE";
    if (scenario === "canceled") return "CANCELED";
    if (scenario === "expired") return "EXPIRED";
    return "ACTIVE";
  }

  private createSession(uuid: string, kind: BillingSession["kind"], billingPeriod?: BillingPeriod): BillingSession {
    this.removeExpiredSessions();
    const hasExpiredPortal = kind === "portal" && this.getState(uuid).portalExpiryMode === "expired";
    const session: BillingSession = {
      token: randomUUID(), uuid, kind, billingPeriod,
      expiresAtMs: this.now() + (hasExpiredPortal ? -BILLING_SESSION_TTL_MS : BILLING_SESSION_TTL_MS),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  private clearPendingSwitch(subscription: SubscriptionDto): void {
    delete subscription.pendingBillingPeriod;
    delete subscription.pendingAppliesAt;
  }

  private invalidateSessions(uuid: string): void {
    for (const [token, session] of this.sessions) {
      if (session.uuid === uuid) this.sessions.delete(token);
    }
  }

  private removeExpiredSessions(): void {
    for (const [token, session] of this.sessions) {
      if (session.expiresAtMs <= this.now()) this.sessions.delete(token);
    }
  }
}
