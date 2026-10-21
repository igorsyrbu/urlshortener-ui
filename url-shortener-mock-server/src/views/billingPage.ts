import {
  BILLING_SCENARIOS,
  type BillingSession,
  type PortalAction,
  type SubscriptionDto,
  type SubscriptionStatus,
} from "../services/billing-constants";
import { html, rawHtml, type SafeHtml } from "../utils/html";
import { BILLING_PAGE_STYLES } from "./billingPageStyles";

interface BillingPageOptions {
  session: BillingSession;
  subscription: SubscriptionDto;
  frontendUrl: string;
  message?: string;
}

interface BillingErrorPageOptions {
  status: number;
  message: string;
  frontendUrl: string;
}

type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral";
type ButtonVariant = "" | "primary" | "danger";

const STATUS_BADGES: Record<SubscriptionStatus, { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  TRIALING: { label: "Trial", tone: "info" },
  PAST_DUE: { label: "Past due", tone: "warning" },
  CANCELED: { label: "Canceled", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "neutral" },
};
const NO_SUBSCRIPTION_BADGE = { label: "No subscription", tone: "neutral" as const };
const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };
const CLOSE_PORTAL_BUTTON_ID = "close-portal";

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString("en-US", DATE_FORMAT);
}

function renderBadge(status: SubscriptionStatus | undefined): SafeHtml {
  const badge = status ? STATUS_BADGES[status] : NO_SUBSCRIPTION_BADGE;
  return html`<span class="badge badge-${badge.tone}">${badge.label}</span>`;
}

function renderDetail(term: string, value: string): SafeHtml {
  return html`<dt>${term}</dt><dd>${value}</dd>`;
}

function renderSubscriptionSummary(subscription: SubscriptionDto): SafeHtml {
  const renewalTerm = subscription.cancelAtPeriodEnd ? "Cancels on" : "Renews on";
  const pendingSwitch = subscription.pendingBillingPeriod === "YEARLY"
    && renderDetail("Switches to yearly", formatDate(subscription.pendingAppliesAt));
  return html`<section class="card" aria-labelledby="subscription-heading">
      <p class="label" id="subscription-heading">Current subscription</p>
      <div class="card-head"><span class="plan">${subscription.plan === "PRO" ? "Pro" : "Free"}</span>${renderBadge(subscription.status)}</div>
      <dl class="details">
        ${renderDetail(renewalTerm, formatDate(subscription.currentPeriodEnd))}
        ${renderDetail("Cancel at renewal", subscription.cancelAtPeriodEnd ? "Yes" : "No")}
        ${pendingSwitch}
      </dl>
    </section>`;
}

function renderPortalActionForm(token: string, action: PortalAction, label: string, variant: ButtonVariant = ""): SafeHtml {
  return html`<form method="post" action="/mock/billing/portal/${token}"><input type="hidden" name="action" value="${action}"><button type="submit" class="${variant}">${label}</button></form>`;
}

function renderPortalActions(token: string, subscription: SubscriptionDto): SafeHtml {
  const pending = subscription.pendingBillingPeriod === "YEARLY"
    && renderPortalActionForm(token, "cancel-yearly-switch", "Cancel yearly switch");
  const cancellationAction = subscription.cancelAtPeriodEnd
    ? renderPortalActionForm(token, "resume-subscription", "Resume subscription", "primary")
    : renderPortalActionForm(token, "cancel-subscription", "Cancel subscription at renewal");
  return html`<section class="card" aria-labelledby="manage-heading">
      <p class="label" id="manage-heading">Manage subscription</p>
      <div class="actions">${pending}${cancellationAction}${renderPortalActionForm(token, "end-subscription", "End subscription immediately", "danger")}</div>
    </section>`;
}

function renderScenarioForm(session: BillingSession): SafeHtml {
  const options = BILLING_SCENARIOS.map((scenario) => html`<option value="${scenario}">${scenario}</option>`);
  return html`<details class="card sandbox"><summary>Sandbox controls</summary>
      <form method="post" action="/mock/billing/portal/${session.token}/scenario">
        <label for="scenario">Subscription scenario</label><select id="scenario" name="scenario">${options}</select>
        <button type="submit">Set scenario and return to billing</button>
      </form>
    </details>`;
}

function renderCheckoutActions(session: BillingSession): SafeHtml {
  const period = session.billingPeriod === "YEARLY" ? "yearly" : "monthly";
  return html`<section class="card" aria-labelledby="checkout-heading">
      <p class="label" id="checkout-heading">Order</p>
      <div class="card-head"><span class="plan">Pro</span><span class="badge badge-info">Billed ${period}</span></div>
      <p class="muted">This sandbox does not collect payment.</p>
      <form method="post" action="/mock/billing/checkout/${session.token}" class="actions"><button type="submit" class="primary">Complete checkout</button></form>
    </section>`;
}

function renderPortalPanel(session: BillingSession, subscription: SubscriptionDto): SafeHtml {
  return html`${renderSubscriptionSummary(subscription)}${renderPortalActions(session.token, subscription)}${renderScenarioForm(session)}
    <p class="muted">Return to your original app tab to refresh billing after making a change.</p>`;
}

function renderTopBar(): SafeHtml {
  return html`<header class="topbar"><div class="topbar-inner">
      <span class="brand"><span class="brand-mark" aria-hidden="true"></span>Mock billing</span>
      <span class="pill">Sandbox</span>
    </div></header>`;
}

/** A listener instead of an inline `onclick`, so the page keeps working under a CSP without `'unsafe-inline'` handlers. */
function renderClosePortalButton(): SafeHtml {
  return html`<button type="button" id="${CLOSE_PORTAL_BUTTON_ID}">Close portal and return to app</button>
    <script>document.getElementById("${CLOSE_PORTAL_BUTTON_ID}").addEventListener("click", () => window.close());</script>`;
}

function renderFooter(frontendUrl: string, canClose: boolean): SafeHtml {
  return html`<footer class="footer"><a class="button" href="${frontendUrl}/settings/billing">← Return to billing</a>${canClose && renderClosePortalButton()}</footer>`;
}

function renderDocument(title: string, content: SafeHtml): string {
  return html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title><style>${rawHtml(BILLING_PAGE_STYLES)}</style></head>
    <body>${renderTopBar()}<main>${content}</main></body></html>`.value;
}

export function renderBillingPage({ session, subscription, frontendUrl, message }: BillingPageOptions): string {
  const isCheckout = session.kind === "checkout";
  const title = isCheckout ? "Mock billing checkout" : "Mock customer billing portal";
  const lead = isCheckout ? "Review your order and complete the checkout." : "Manage your subscription.";
  const panel = isCheckout ? renderCheckoutActions(session) : renderPortalPanel(session, subscription);
  return renderDocument(title, html`
      <div><h1>${title}</h1><p class="lead">${lead}</p></div>
      ${message && html`<p class="notice" role="status">${message}</p>`}
      ${panel}${renderFooter(frontendUrl, !isCheckout)}`);
}

/** Hosted pages are opened in a browser tab, so their failures are pages too, with a way back to the app. */
export function renderBillingErrorPage({ status, message, frontendUrl }: BillingErrorPageOptions): string {
  return renderDocument("Mock billing", html`
      <div><h1>This billing page cannot continue</h1><p class="lead">Error ${status}</p></div>
      <p class="notice" role="alert">${message}</p>
      ${renderFooter(frontendUrl, false)}`);
}
