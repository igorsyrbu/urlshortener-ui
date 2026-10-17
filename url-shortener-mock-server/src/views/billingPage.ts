import {
  BILLING_SCENARIOS,
  type BillingSession,
  type SubscriptionDto,
  type SubscriptionStatus,
} from "../services/billing-constants";
import { BILLING_PAGE_STYLES } from "./billingPageStyles";

interface BillingPageOptions {
  session: BillingSession;
  subscription: SubscriptionDto;
  frontendUrl: string;
  message?: string;
}

type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

const STATUS_BADGES: Record<SubscriptionStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  TRIALING: { label: "Trial", tone: "info" },
  PAST_DUE: { label: "Past due", tone: "warning" },
  CANCELED: { label: "Canceled", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};
const NO_SUBSCRIPTION_BADGE = { label: "No subscription", tone: "neutral" as const };
const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? escapeHtml(isoDate) : date.toLocaleDateString("en-US", DATE_FORMAT);
}

function renderBadge(status: SubscriptionStatus | undefined): string {
  const badge = status ? STATUS_BADGES[status] : NO_SUBSCRIPTION_BADGE;
  return `<span class="badge badge-${badge.tone}">${badge.label}</span>`;
}

function renderDetail(term: string, value: string): string {
  return `<dt>${term}</dt><dd>${value}</dd>`;
}

function renderSubscriptionCard(subscription: SubscriptionDto): string {
  const renewalTerm = subscription.cancelAtPeriodEnd ? "Cancels on" : "Renews on";
  const pendingSwitch = subscription.pendingBillingPeriod === "YEARLY"
    ? renderDetail("Switches to yearly", formatDate(subscription.pendingAppliesAt)) : "";
  return `<section class="card" aria-labelledby="subscription-heading">
      <p class="label" id="subscription-heading">Current subscription</p>
      <div class="card-head"><span class="plan">${subscription.plan === "PRO" ? "Pro" : "Free"}</span>${renderBadge(subscription.status)}</div>
      <dl class="details">
        ${renderDetail(renewalTerm, formatDate(subscription.currentPeriodEnd))}
        ${renderDetail("Cancel at renewal", subscription.cancelAtPeriodEnd ? "Yes" : "No")}
        ${pendingSwitch}
      </dl>
    </section>`;
}

function portalActionForm(token: string, action: string, label: string, variant = ""): string {
  return `<form method="post" action="/mock/billing/portal/${token}"><input type="hidden" name="action" value="${action}"><button type="submit" class="${variant}">${label}</button></form>`;
}

function renderPortalActions(token: string, subscription: SubscriptionDto): string {
  const pending = subscription.pendingBillingPeriod === "YEARLY"
    ? portalActionForm(token, "cancel-yearly-switch", "Cancel yearly switch") : "";
  const cancellationAction = subscription.cancelAtPeriodEnd
    ? portalActionForm(token, "resume-subscription", "Resume subscription", "primary")
    : portalActionForm(token, "cancel-subscription", "Cancel subscription at renewal");
  return `<section class="card" aria-labelledby="manage-heading">
      <p class="label" id="manage-heading">Manage subscription</p>
      <div class="actions">${pending}${cancellationAction}${portalActionForm(token, "end-subscription", "End subscription immediately", "danger")}</div>
    </section>`;
}

function renderScenarioForm(session: BillingSession): string {
  const options = BILLING_SCENARIOS.map((scenario) => `<option value="${scenario}">${scenario}</option>`).join("");
  return `<details class="card sandbox"><summary>Sandbox controls</summary>
      <form method="post" action="/mock/billing/portal/${session.token}/scenario">
        <label for="scenario">Subscription scenario</label><select id="scenario" name="scenario">${options}</select>
        <button type="submit">Set scenario and return to billing</button>
      </form>
    </details>`;
}

function renderCheckoutBody(session: BillingSession): string {
  const period = session.billingPeriod === "YEARLY" ? "yearly" : "monthly";
  return `<section class="card" aria-labelledby="checkout-heading">
      <p class="label" id="checkout-heading">Order</p>
      <div class="card-head"><span class="plan">Pro</span><span class="badge badge-info">Billed ${period}</span></div>
      <p class="muted">This sandbox does not collect payment.</p>
      <form method="post" action="/mock/billing/checkout/${session.token}" class="actions"><button type="submit" class="primary">Complete checkout</button></form>
    </section>`;
}

function renderPortalBody(session: BillingSession, subscription: SubscriptionDto): string {
  return `${renderSubscriptionCard(subscription)}${renderPortalActions(session.token, subscription)}${renderScenarioForm(session)}
    <p class="muted">Return to your original app tab to refresh billing after making a change.</p>`;
}

function renderTopBar(): string {
  return `<header class="topbar"><div class="topbar-inner">
      <span class="brand"><span class="brand-mark" aria-hidden="true"></span>Mock billing</span>
      <span class="pill">Sandbox</span>
    </div></header>`;
}

function renderFooter(frontendUrl: string, isCheckout: boolean): string {
  const close = isCheckout ? "" : `<button type="button" onclick="window.close()">Close portal and return to app</button>`;
  return `<footer class="footer"><a class="button" href="${escapeHtml(frontendUrl)}/settings/billing">← Return to billing</a>${close}</footer>`;
}

export function renderBillingPage({ session, subscription, frontendUrl, message }: BillingPageOptions): string {
  const isCheckout = session.kind === "checkout";
  const title = isCheckout ? "Mock billing checkout" : "Mock customer billing portal";
  const lead = isCheckout ? "Review your order and complete the checkout." : "Manage your subscription.";
  const body = isCheckout ? renderCheckoutBody(session) : renderPortalBody(session, subscription);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title><style>${BILLING_PAGE_STYLES}</style></head>
    <body>${renderTopBar()}<main>
      <div><h1>${title}</h1><p class="lead">${lead}</p></div>
      ${message ? `<p class="notice" role="status">${escapeHtml(message)}</p>` : ""}
      ${body}${renderFooter(frontendUrl, isCheckout)}
    </main></body></html>`;
}
