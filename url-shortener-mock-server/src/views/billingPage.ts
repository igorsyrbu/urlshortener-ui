import { BILLING_SCENARIOS, type BillingSession, type SubscriptionDto } from "../services/billing-constants";

interface BillingPageOptions {
  session: BillingSession;
  subscription: SubscriptionDto;
  frontendUrl: string;
  message?: string;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function portalActionForm(token: string, action: string, label: string): string {
  return `<form method="post" action="/mock/billing/portal/${token}"><input type="hidden" name="action" value="${action}"><button type="submit">${label}</button></form>`;
}

function renderPortalActions(token: string, subscription: SubscriptionDto): string {
  const pending = subscription.pendingBillingPeriod === "YEARLY"
    ? portalActionForm(token, "cancel-yearly-switch", "Cancel yearly switch") : "";
  const cancellationAction = subscription.cancelAtPeriodEnd
    ? portalActionForm(token, "resume-subscription", "Resume subscription")
    : portalActionForm(token, "cancel-subscription", "Cancel subscription at renewal");
  return `${pending}${cancellationAction}${portalActionForm(token, "end-subscription", "End subscription immediately")}`;
}

function renderScenarioForm(session: BillingSession): string {
  const options = BILLING_SCENARIOS.map((scenario) => `<option value="${scenario}">${scenario}</option>`).join("");
  return `<details><summary>Mock billing scenarios</summary>
    <form method="post" action="/mock/billing/portal/${session.token}/scenario">
      <label for="scenario">Subscription scenario</label><select id="scenario" name="scenario">${options}</select>
      <button type="submit">Set scenario and return to billing</button>
    </form></details>`;
}

export function renderBillingPage({ session, subscription, frontendUrl, message }: BillingPageOptions): string {
  const isCheckout = session.kind === "checkout";
  const title = isCheckout ? "Mock billing checkout" : "Mock customer billing portal";
  const actions = isCheckout
    ? `<p>Pro ${session.billingPeriod?.toLowerCase()} subscription. This sandbox does not collect payment.</p>
      <form method="post" action="/mock/billing/checkout/${session.token}"><button type="submit">Complete checkout</button></form>`
    : `${renderPortalActions(session.token, subscription)}${renderScenarioForm(session)}
      <p>Return to your original app tab to refresh billing after making a change.</p>
      <button type="button" onclick="window.close()">Close portal and return to app</button>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
    <body><main><h1>${title}</h1>${message ? `<p role="status">${escapeHtml(message)}</p>` : ""}
    <h2>Current subscription</h2><dl>
    <dt>Plan</dt><dd>${subscription.plan}</dd><dt>Status</dt><dd>${subscription.status ?? "No subscription"}</dd>
    <dt>Renews until</dt><dd>${escapeHtml(subscription.currentPeriodEnd ?? "N/A")}</dd>
    <dt>Cancel at renewal</dt><dd>${subscription.cancelAtPeriodEnd ? "Yes" : "No"}</dd>
    <dt>Scheduled billing period</dt><dd>${subscription.pendingBillingPeriod ?? "None"}</dd></dl>
    ${actions}<p><a href="${escapeHtml(frontendUrl)}/settings/billing">Return to billing</a></p></main></body></html>`;
}
