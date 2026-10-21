import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BillingService, BillingError } from "./BillingService";
import {
  BILLING_SESSION_TTL_MS, INVALID_EXPIRES_IN_SECONDS, MAX_LIVE_SESSIONS_PER_USER, SECOND_MS, HTTP_CONFLICT, HTTP_NOT_FOUND, HTTP_UNPROCESSABLE_ENTITY,
  MONTHLY_PERIOD_MS, type BillingScenario, type PortalExpiryMode,
} from "./billing-constants";

const USER_ID = "billing-user";
const OTHER_USER_ID = "other-billing-user";
const CURRENT_TIME_MS = Date.parse("2026-10-13T00:00:00Z");

interface BillingTestContext {
  service: BillingService;
  advanceTime: (durationMs: number) => void;
}

function createBillingContext(scenario: BillingScenario = "free"): BillingTestContext {
  let currentTimeMs = CURRENT_TIME_MS;
  const service = new BillingService(() => currentTimeMs);
  service.setScenario(USER_ID, scenario);
  return { service, advanceTime: (durationMs: number): void => { currentTimeMs += durationMs; } };
}

function isBillingError(status: number): (error: unknown) => boolean {
  return (error: unknown): boolean => error instanceof BillingError && error.status === status;
}

describe("BillingService subscription state", () => {
  it("returns Free without a subscription or billing history", () => {
    const { service } = createBillingContext();

    assert.deepEqual(service.getSubscription(USER_ID), { plan: "FREE", cancelAtPeriodEnd: false });
    assert.throws(() => service.createPortal(USER_ID), isBillingError(HTTP_NOT_FOUND));
  });

  for (const scenario of ["pro-monthly", "pro-yearly", "pro-pending", "pro-canceling", "trialing"] satisfies BillingScenario[]) {
    it(`entitles the ${scenario} scenario to Pro`, () => {
      const { service } = createBillingContext(scenario);

      assert.equal(service.getSubscription(USER_ID).plan, "PRO");
      assert.ok(service.createPortal(USER_ID).token);
    });
  }

  for (const scenario of ["past-due", "canceled", "expired"] satisfies BillingScenario[]) {
    it(`retains billing history but returns Free for ${scenario}`, () => {
      const { service } = createBillingContext(scenario);

      assert.equal(service.getSubscription(USER_ID).plan, "FREE");
      assert.ok(service.createPortal(USER_ID).token);
    });
  }

  it("loses Pro entitlement exactly at the period end", () => {
    const { service, advanceTime } = createBillingContext("pro-monthly");

    advanceTime(MONTHLY_PERIOD_MS);

    assert.equal(service.getSubscription(USER_ID).plan, "FREE");
  });

  it("isolates subscription changes between sandbox users", () => {
    const { service } = createBillingContext("pro-monthly");
    service.setScenario(OTHER_USER_ID, "pro-monthly");

    service.applyPortalAction(USER_ID, "cancel-subscription");

    assert.equal(service.getSubscription(USER_ID).cancelAtPeriodEnd, true);
    assert.equal(service.getSubscription(OTHER_USER_ID).cancelAtPeriodEnd, false);
  });
});

describe("BillingService checkout", () => {
  for (const period of ["MONTHLY", "YEARLY"] as const) {
    it(`activates ${period} Pro only after checkout completes`, () => {
      const { service } = createBillingContext();
      const session = service.createCheckout(USER_ID, period);
      assert.equal(service.getSubscription(USER_ID).plan, "FREE");

      service.completeCheckout(session);

      assert.equal(service.getSubscription(USER_ID).plan, "PRO");
      assert.equal(service.getOrCreateState(USER_ID).billingPeriod, period);
      assert.equal(service.getSession(session.token, "checkout"), null);
    });
  }

  it("rejects checkout for an existing entitled subscription", () => {
    const { service } = createBillingContext("pro-monthly");

    assert.throws(() => service.createCheckout(USER_ID, "YEARLY"), isBillingError(HTTP_CONFLICT));
  });
});

describe("BillingService yearly upgrade", () => {
  it("schedules yearly billing at renewal without changing the current period", () => {
    const { service } = createBillingContext("pro-monthly");
    const initial = service.getSubscription(USER_ID);

    const response = service.scheduleYearlyUpgrade(USER_ID);

    assert.deepEqual(response, { status: "scheduled", effectiveDate: initial.currentPeriodEnd });
    assert.deepEqual(service.getSubscription(USER_ID), {
      ...initial, pendingBillingPeriod: "YEARLY", pendingAppliesAt: initial.currentPeriodEnd,
    });
    assert.equal(service.getOrCreateState(USER_ID).billingPeriod, "MONTHLY");
  });

  it("reports a missing subscription", () => {
    const { service } = createBillingContext();

    assert.throws(() => service.scheduleYearlyUpgrade(USER_ID), isBillingError(HTTP_NOT_FOUND));
  });

  for (const scenario of ["pro-yearly", "pro-pending", "pro-canceling"] satisfies BillingScenario[]) {
    it(`reports a conflict for ${scenario}`, () => {
      const { service } = createBillingContext(scenario);

      assert.throws(() => service.scheduleYearlyUpgrade(USER_ID), isBillingError(HTTP_CONFLICT));
    });
  }

  for (const scenario of ["past-due", "canceled", "expired"] satisfies BillingScenario[]) {
    it(`reports ${scenario} as ineligible`, () => {
      const { service } = createBillingContext(scenario);

      assert.throws(() => service.scheduleYearlyUpgrade(USER_ID), isBillingError(HTTP_UNPROCESSABLE_ENTITY));
    });
  }
});

describe("BillingService portal changes", () => {
  it("clears a scheduled yearly switch and lets it be scheduled again", () => {
    const { service } = createBillingContext("pro-pending");

    service.applyPortalAction(USER_ID, "cancel-yearly-switch");

    assert.equal(service.getSubscription(USER_ID).pendingBillingPeriod, undefined);
    assert.equal(service.getSubscription(USER_ID).pendingAppliesAt, undefined);
    assert.equal(service.scheduleYearlyUpgrade(USER_ID).status, "scheduled");
  });

  it("cancels at renewal while retaining Pro and clearing pending changes", () => {
    const { service } = createBillingContext("pro-pending");

    service.applyPortalAction(USER_ID, "cancel-subscription");

    assert.equal(service.getSubscription(USER_ID).plan, "PRO");
    assert.equal(service.getSubscription(USER_ID).cancelAtPeriodEnd, true);
    assert.equal(service.getSubscription(USER_ID).pendingBillingPeriod, undefined);
  });

  it("resumes renewal for a canceling subscription", () => {
    const { service } = createBillingContext("pro-canceling");

    service.applyPortalAction(USER_ID, "resume-subscription");

    assert.equal(service.getSubscription(USER_ID).cancelAtPeriodEnd, false);
    assert.equal(service.getSubscription(USER_ID).plan, "PRO");
  });

  it("ends a subscription immediately and keeps portal access", () => {
    const { service } = createBillingContext("pro-monthly");

    service.applyPortalAction(USER_ID, "end-subscription");

    assert.equal(service.getSubscription(USER_ID).plan, "FREE");
    assert.equal(service.getSubscription(USER_ID).status, "CANCELED");
    assert.ok(service.createPortal(USER_ID).token);
  });

  it("rejects cancellation of an inactive subscription", () => {
    const { service } = createBillingContext("canceled");

    assert.throws(() => service.applyPortalAction(USER_ID, "cancel-subscription"), isBillingError(HTTP_CONFLICT));
  });
});

describe("BillingService portal links", () => {
  const cases: Array<[PortalExpiryMode, unknown]> = [
    ["reported", BILLING_SESSION_TTL_MS / SECOND_MS],
    ["omitted", undefined],
    ["invalid", INVALID_EXPIRES_IN_SECONDS],
    ["expired", 0],
  ];
  for (const [mode, expected] of cases) {
    it(`shapes expiresInSeconds for the ${mode} mode`, () => {
      const { service } = createBillingContext("pro-monthly");
      service.setScenario(USER_ID, "pro-monthly", mode);

      const { expiry } = service.createPortalLink(USER_ID);

      assert.equal(expiry.expiresInSeconds, expected);
      assert.equal("expiresInSeconds" in expiry, mode !== "omitted");
    });
  }

  it("keeps the expiry mode when the scenario changes without one", () => {
    const { service } = createBillingContext("pro-monthly");
    service.setScenario(USER_ID, "pro-monthly", "invalid");

    service.setScenario(USER_ID, "pro-yearly");

    assert.equal(service.getOrCreateState(USER_ID).portalExpiryMode, "invalid");
  });

  it("starts a new user with the configured default expiry mode", () => {
    const service = new BillingService(() => CURRENT_TIME_MS, { scenario: "pro-monthly", portalExpiry: "omitted" });

    assert.equal(service.getOrCreateState(USER_ID).portalExpiryMode, "omitted");
    assert.equal(service.getSubscription(USER_ID).plan, "PRO");
  });
});

describe("BillingService sessions", () => {
  it("creates a fresh portal session on every request", () => {
    const { service } = createBillingContext("pro-monthly");

    const first = service.createPortal(USER_ID);
    const second = service.createPortal(USER_ID);

    assert.notEqual(first.token, second.token);
    assert.equal(first.expiresAtMs, CURRENT_TIME_MS + BILLING_SESSION_TTL_MS);
  });

  it("expires a session exactly at its one-hour deadline", () => {
    const { service, advanceTime } = createBillingContext("pro-monthly");
    const session = service.createPortal(USER_ID);

    advanceTime(BILLING_SESSION_TTL_MS);

    assert.equal(service.getSession(session.token, "portal"), null);
  });

  it("rejects missing tokens and tokens for the other session type", () => {
    const { service } = createBillingContext("pro-monthly");
    const session = service.createPortal(USER_ID);

    assert.equal(service.getSession("unknown-token", "portal"), null);
    assert.equal(service.getSession(session.token, "checkout"), null);
  });

  it("keeps at most the newest sessions per user and drops the oldest", () => {
    const { service } = createBillingContext("pro-monthly");
    service.setScenario(OTHER_USER_ID, "pro-monthly");
    const otherUserSession = service.createPortal(OTHER_USER_ID);
    const sessions = Array.from({ length: MAX_LIVE_SESSIONS_PER_USER + 1 }, () => service.createPortal(USER_ID));

    assert.equal(service.getSession(sessions[0].token, "portal"), null);
    assert.notEqual(service.getSession(sessions[1].token, "portal"), null);
    assert.notEqual(service.getSession(sessions[MAX_LIVE_SESSIONS_PER_USER].token, "portal"), null);
    assert.notEqual(service.getSession(otherUserSession.token, "portal"), null);
  });

  it("invalidates old links when a scenario is reset", () => {
    const { service } = createBillingContext("pro-monthly");
    const session = service.createPortal(USER_ID);

    service.setScenario(USER_ID, "pro-pending");

    assert.equal(service.getSession(session.token, "portal"), null);
  });
});
