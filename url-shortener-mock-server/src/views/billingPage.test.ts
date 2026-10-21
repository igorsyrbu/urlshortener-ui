import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BillingSession, SubscriptionDto } from "../services/billing-constants";
import { renderBillingErrorPage, renderBillingPage } from "./billingPage";

const FRONTEND_URL = "http://localhost:3000";
const PERIOD_END = "2026-11-15T12:00:00.000Z";

function portalSession(): BillingSession {
  return { token: "portal-token", uuid: "user-1", kind: "portal", expiresAtMs: Date.now() };
}

function proSubscription(overrides: Partial<SubscriptionDto> = {}): SubscriptionDto {
  return { plan: "PRO", status: "ACTIVE", currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd: false, ...overrides };
}

function renderPortal(subscription: SubscriptionDto, message?: string): string {
  return renderBillingPage({ session: portalSession(), subscription, frontendUrl: FRONTEND_URL, message });
}

describe("renderBillingPage portal", () => {
  it("shows the plan, a status badge and a readable renewal date", () => {
    const html = renderPortal(proSubscription());

    assert.match(html, /class="plan">Pro</);
    assert.match(html, /badge-success">Active</);
    assert.match(html, /Renews on<\/dt><dd>November 15, 2026</);
  });

  it("marks a past-due subscription with a warning badge", () => {
    assert.match(renderPortal(proSubscription({ status: "PAST_DUE" })), /badge-warning">Past due</);
  });

  it("labels a subscription without status as having none", () => {
    assert.match(renderPortal({ plan: "FREE", cancelAtPeriodEnd: false }), /badge-neutral">No subscription</);
  });

  it("shows the cancellation date and offers resume when the subscription ends at renewal", () => {
    const html = renderPortal(proSubscription({ cancelAtPeriodEnd: true }));

    assert.match(html, /Cancels on<\/dt>/);
    assert.match(html, /value="resume-subscription"><button type="submit" class="primary">Resume subscription</);
  });

  it("shows a scheduled yearly switch and lets the user cancel it", () => {
    const html = renderPortal(proSubscription({ pendingBillingPeriod: "YEARLY", pendingAppliesAt: PERIOD_END }));

    assert.match(html, /Switches to yearly<\/dt><dd>November 15, 2026</);
    assert.match(html, /Cancel yearly switch/);
  });

  it("escapes the status message and an unparsable date", () => {
    const html = renderPortal(proSubscription({ currentPeriodEnd: "<soon>" }), "<script>alert(1)</script>");

    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /&lt;soon&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
  });

  it("escapes a hostile frontend URL and session token", () => {
    const hostile = `"><script>alert(1)</script>`;
    const session: BillingSession = { ...portalSession(), token: hostile };

    const html = renderBillingPage({ session, subscription: proSubscription(), frontendUrl: hostile });

    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /href="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;\/settings\/billing"/);
  });

  it("closes the portal through a listener, not an inline handler", () => {
    const html = renderPortal(proSubscription());

    assert.match(html, /<button type="button" id="close-portal">/);
    assert.doesNotMatch(html, /onclick=/);
  });
});

describe("renderBillingPage checkout", () => {
  it("shows the ordered billing period and the checkout button", () => {
    const session: BillingSession = { ...portalSession(), kind: "checkout", billingPeriod: "YEARLY" };

    const html = renderBillingPage({ session, subscription: { plan: "FREE", cancelAtPeriodEnd: false }, frontendUrl: FRONTEND_URL });

    assert.match(html, /Billed yearly/);
    assert.match(html, /Complete checkout/);
    assert.doesNotMatch(html, /Close portal/);
  });
});

describe("renderBillingErrorPage", () => {
  it("shows the status, the escaped message and a way back to billing", () => {
    const html = renderBillingErrorPage({ status: 410, message: "<expired>", frontendUrl: FRONTEND_URL });

    assert.match(html, /Error 410/);
    assert.match(html, /role="alert">&lt;expired&gt;</);
    assert.match(html, /href="http:\/\/localhost:3000\/settings\/billing"/);
    assert.doesNotMatch(html, /close-portal/);
  });
});
