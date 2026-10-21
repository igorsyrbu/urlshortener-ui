import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import {
  createTestUser, requestJson, startTestServer, TEST_CONFIG, testBillingService, type TestServer, type TestUser,
} from "../test-utils";
import {
  BILLING_READ_RATE_LIMIT, BILLING_RETRY_AFTER_HEADER, BILLING_SESSION_TTL_MS, BILLING_WRITE_RATE_LIMIT,
  HTTP_OK, HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_GONE, HTTP_NOT_FOUND,
  HTTP_SEE_OTHER, HTTP_TOO_MANY_REQUESTS, HTTP_UNPROCESSABLE_ENTITY, SECOND_MS,
  type BillingScenario, type PortalExpiryMode,
} from "../services/billing-constants";

const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_UNAUTHORIZED = 401;
const INVALID_LONG_VALUE = "x".repeat(250);
const FRONTEND_URL = TEST_CONFIG.frontendUrl;
const JSON_CONTENT_TYPE = "application/json";
let server: TestServer;
let user: TestUser;

before(async () => { server = await startTestServer(); });
after(async () => { await server.close(); });
beforeEach(() => {
  user = createTestUser();
  testBillingService.setScenario(user.uuid, "free");
});

function readObject(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return Object.fromEntries(Object.entries(value));
}

function readString(value: unknown): string {
  assert.equal(typeof value, "string");
  if (typeof value !== "string") throw new Error("Expected a string response field.");
  return value;
}

async function createPortalUrl(): Promise<string> {
  const response = await requestJson(server, "POST", "/billing/portal", { authorization: user.authorization });
  assert.equal(response.status, HTTP_OK);
  return readString(readObject(response.body).url);
}

async function createCheckoutUrl(period: "MONTHLY" | "YEARLY" = "MONTHLY"): Promise<string> {
  const response = await requestJson(server, "POST", "/billing/checkout", { authorization: user.authorization, body: { billingPeriod: period } });
  assert.equal(response.status, HTTP_OK);
  return readString(readObject(response.body).url);
}

async function postPortalAction(url: string, action: string): Promise<Response> {
  return fetch(url, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ action }), redirect: "manual",
  });
}

describe("billing subscription endpoint", () => {
  it("returns the default Free subscription without optional fields", async () => {
    const response = await requestJson(server, "GET", "/billing/subscription", { authorization: user.authorization });

    assert.equal(response.status, HTTP_OK);
    assert.deepEqual(response.body, { plan: "FREE", cancelAtPeriodEnd: false });
  });

  it("returns a pending yearly switch after it is scheduled", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const scheduled = await requestJson(server, "POST", "/billing/subscription/upgrade", { authorization: user.authorization });

    const subscription = await requestJson(server, "GET", "/billing/subscription", { authorization: user.authorization });

    assert.equal(scheduled.status, HTTP_OK);
    assert.equal(readObject(subscription.body).pendingBillingPeriod, "YEARLY");
    assert.equal(readObject(subscription.body).pendingAppliesAt, readObject(scheduled.body).effectiveDate);
  });

  it("marks subscription responses as non-cacheable", async () => {
    const response = await fetch(`${server.baseUrl}/billing/subscription`, { headers: { Authorization: user.authorization } });

    assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

describe("billing checkout endpoint", () => {
  const invalidBodies: Array<[string, unknown]> = [
    ["missing body", undefined], ["missing period", {}], ["null period", { billingPeriod: null }],
    ["lowercase period", { billingPeriod: "monthly" }], ["long period", { billingPeriod: INVALID_LONG_VALUE }],
  ];
  for (const [name, body] of invalidBodies) {
    it(`rejects a ${name}`, async () => {
      const response = await requestJson(server, "POST", "/billing/checkout", { authorization: user.authorization, body });

      assert.equal(response.status, HTTP_BAD_REQUEST);
    });
  }

  for (const billingPeriod of ["MONTHLY", "YEARLY"] as const) {
    it(`completes a ${billingPeriod} checkout and returns to billing`, async () => {
      const url = await createCheckoutUrl(billingPeriod);
      const page = await fetch(url);
      assert.match(await page.text(), /Complete checkout/);
      assert.equal(testBillingService.getSubscription(user.uuid).plan, "FREE");

      const completed = await fetch(url, { method: "POST", redirect: "manual" });

      assert.equal(completed.status, HTTP_SEE_OTHER);
      assert.equal(completed.headers.get("location"), `${FRONTEND_URL}/settings/billing`);
      assert.equal(testBillingService.getSubscription(user.uuid).plan, "PRO");
      assert.equal(testBillingService.getState(user.uuid).billingPeriod, billingPeriod);
      assert.equal((await fetch(url, { method: "POST", redirect: "manual" })).status, HTTP_GONE);
    });
  }

  it("rejects checkout when already on Pro", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");

    const response = await requestJson(server, "POST", "/billing/checkout", { authorization: user.authorization, body: { billingPeriod: "MONTHLY" } });

    assert.equal(response.status, HTTP_CONFLICT);
  });

  it("does not expose a portal session through the checkout route", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const portalUrl = await createPortalUrl();

    const response = await fetch(portalUrl.replace("/portal/", "/checkout/"));

    assert.equal(response.status, HTTP_GONE);
  });
});

describe("billing upgrade endpoint", () => {
  const scenarios: Array<[BillingScenario, number]> = [
    ["free", HTTP_NOT_FOUND], ["pro-yearly", HTTP_CONFLICT], ["pro-pending", HTTP_CONFLICT],
    ["pro-canceling", HTTP_CONFLICT], ["past-due", HTTP_UNPROCESSABLE_ENTITY],
  ];
  for (const [scenario, status] of scenarios) {
    it(`returns ${status} for ${scenario}`, async () => {
      testBillingService.setScenario(user.uuid, scenario);

      const response = await requestJson(server, "POST", "/billing/subscription/upgrade", { authorization: user.authorization });

      assert.equal(response.status, status);
    });
  }
});

describe("billing portal endpoint", () => {
  it("returns 404 for a user without billing history", async () => {
    const response = await requestJson(server, "POST", "/billing/portal", { authorization: user.authorization });

    assert.equal(response.status, HTTP_NOT_FOUND);
  });

  it("returns a fresh preauthenticated one-hour session URL with remaining whole seconds", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const requestStartedAt = Date.now();

    const response = await requestJson(server, "POST", "/billing/portal", { authorization: user.authorization });
    const payload = readObject(response.body);
    const page = await fetch(readString(payload.url));

    assert.equal(response.status, HTTP_OK);
    const expiresInSeconds = payload.expiresInSeconds;
    const minimumRemainingSeconds = Math.max(0, Math.floor((requestStartedAt + BILLING_SESSION_TTL_MS - Date.now()) / SECOND_MS));
    assert.ok(typeof expiresInSeconds === "number");
    assert.ok(Number.isInteger(expiresInSeconds));
    assert.ok(expiresInSeconds >= minimumRemainingSeconds);
    assert.ok(expiresInSeconds <= BILLING_SESSION_TTL_MS / SECOND_MS);
    assert.equal(payload.expiresAt, undefined);
    assert.ok(readString(payload.url).startsWith(`${server.baseUrl}/mock/billing/portal/`));
    assert.equal(readString(payload.url).includes(user.uuid), false);
    assert.match(await page.text(), /Mock customer billing portal/);
    assert.equal(page.headers.get("referrer-policy"), "no-referrer");
    assert.notEqual(await createPortalUrl(), payload.url);
  });

  for (const mode of ["omitted", "invalid", "expired"] satisfies PortalExpiryMode[]) {
    it(`supports a ${mode} expiration payload for return-flag tests`, async () => {
      testBillingService.setScenario(user.uuid, "pro-monthly", mode);

      const response = await requestJson(server, "POST", "/billing/portal", { authorization: user.authorization });
      const payload = readObject(response.body);

      assert.equal(payload.expiresAt, undefined);
      if (mode === "omitted") assert.equal(payload.expiresInSeconds, undefined);
      if (mode === "invalid") assert.equal(payload.expiresInSeconds, "not-a-number");
      if (mode === "expired") {
        assert.equal(payload.expiresInSeconds, 0);
        assert.equal((await fetch(readString(payload.url))).status, HTTP_GONE);
      }
    });
  }

  it("clears pending switch fields after cancelling through the portal", async () => {
    testBillingService.setScenario(user.uuid, "pro-pending");
    const url = await createPortalUrl();
    assert.match(await (await fetch(url)).text(), /Cancel yearly switch/);

    const updated = await postPortalAction(url, "cancel-yearly-switch");
    const subscription = await requestJson(server, "GET", "/billing/subscription", { authorization: user.authorization });

    assert.match(await updated.text(), /Subscription updated/);
    assert.equal(readObject(subscription.body).pendingBillingPeriod, undefined);
    assert.equal(readObject(subscription.body).pendingAppliesAt, undefined);
    assert.equal(readObject(subscription.body).plan, "PRO");
  });

  it("cancels and resumes renewal through browser form submissions", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const url = await createPortalUrl();

    const canceled = await postPortalAction(url, "cancel-subscription");

    assert.equal(testBillingService.getSubscription(user.uuid).cancelAtPeriodEnd, true);
    assert.match(await canceled.text(), /Resume subscription/);

    await postPortalAction(url, "resume-subscription");

    assert.equal(testBillingService.getSubscription(user.uuid).cancelAtPeriodEnd, false);
  });

  it("keeps changes confined to the user who opened the portal", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const otherUser = createTestUser();
    testBillingService.setScenario(otherUser.uuid, "pro-monthly");
    const url = await createPortalUrl();

    await postPortalAction(url, "cancel-subscription");

    assert.equal(testBillingService.getSubscription(user.uuid).cancelAtPeriodEnd, true);
    assert.equal(testBillingService.getSubscription(otherUser.uuid).cancelAtPeriodEnd, false);
  });

  it("rejects a missing session without applying an action", async () => {
    const response = await postPortalAction(`${server.baseUrl}/mock/billing/portal/unknown`, "cancel-subscription");

    assert.equal(response.status, HTTP_GONE);
    assert.equal(testBillingService.getSubscription(user.uuid).cancelAtPeriodEnd, false);
  });

  it("rejects invalid actions without changing the subscription", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const url = await createPortalUrl();

    const response = await postPortalAction(url, INVALID_LONG_VALUE);

    assert.equal(response.status, HTTP_BAD_REQUEST);
    assert.equal(testBillingService.getSubscription(user.uuid).cancelAtPeriodEnd, false);
  });

  it("supports scenario changes through the portal form", async () => {
    testBillingService.setScenario(user.uuid, "pro-monthly");
    const url = await createPortalUrl();

    const response = await fetch(`${url}/scenario`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ scenario: "pro-pending" }), redirect: "manual",
    });

    assert.equal(response.status, HTTP_SEE_OTHER);
    assert.equal(response.headers.get("location"), `${FRONTEND_URL}/settings/billing`);
    assert.equal(testBillingService.getSubscription(user.uuid).pendingBillingPeriod, "YEARLY");
    assert.equal((await fetch(url)).status, HTTP_GONE);
  });
});

describe("mock billing scenario endpoint", () => {
  it("configures billing and portal expiration for the authenticated sandbox", async () => {
    const response = await requestJson(server, "POST", "/mock/billing/scenario", {
      authorization: user.authorization, body: { scenario: "pro-pending", portalExpiryMode: "omitted" },
    });

    assert.equal(response.status, HTTP_OK);
    assert.equal(readObject(response.body).pendingBillingPeriod, "YEARLY");
    assert.equal(testBillingService.getState(user.uuid).portalExpiryMode, "omitted");
  });

  const invalidBodies: unknown[] = [undefined, {}, { scenario: INVALID_LONG_VALUE }, { scenario: "pro-monthly", portalExpiryMode: "unknown" }];
  for (const [index, body] of invalidBodies.entries()) {
    it(`rejects invalid scenario request ${index + 1}`, async () => {
      const response = await requestJson(server, "POST", "/mock/billing/scenario", { authorization: user.authorization, body });

      assert.equal(response.status, HTTP_BAD_REQUEST);
      assert.equal(testBillingService.getSubscription(user.uuid).plan, "FREE");
    });
  }

  it("requires bearer authentication", async () => {
    const response = await requestJson(server, "POST", "/mock/billing/scenario", { body: { scenario: "pro-monthly" } });

    assert.equal(response.status, HTTP_UNAUTHORIZED);
  });
});

describe("billing rate limits and provider failures", () => {
  const writeEndpoints: Array<[string, unknown]> = [
    ["/billing/checkout", { billingPeriod: "MONTHLY" }], ["/billing/portal", undefined], ["/billing/subscription/upgrade", undefined],
  ];
  for (const [path, body] of writeEndpoints) {
    it(`limits ${path} to ten requests per minute with readable retry headers`, async () => {
      for (let index = 0; index < BILLING_WRITE_RATE_LIMIT; index += 1) {
        const accepted = await requestJson(server, "POST", path, { authorization: user.authorization, body });
        assert.notEqual(accepted.status, HTTP_TOO_MANY_REQUESTS);
      }

      const response = await fetch(`${server.baseUrl}${path}`, {
        method: "POST", headers: { Authorization: user.authorization, "Content-Type": JSON_CONTENT_TYPE, Origin: FRONTEND_URL },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      assert.equal(response.status, HTTP_TOO_MANY_REQUESTS);
      assert.ok(Number(response.headers.get(BILLING_RETRY_AFTER_HEADER)) > 0);
      assert.equal(response.headers.get("retry-after"), response.headers.get(BILLING_RETRY_AFTER_HEADER));
      assert.match(response.headers.get("access-control-expose-headers") ?? "", new RegExp(BILLING_RETRY_AFTER_HEADER));
    });
  }

  it("limits subscription reads to sixty per minute", async () => {
    for (let index = 0; index < BILLING_READ_RATE_LIMIT; index += 1) {
      assert.equal((await requestJson(server, "GET", "/billing/subscription", { authorization: user.authorization })).status, HTTP_OK);
    }

    const response = await requestJson(server, "GET", "/billing/subscription", { authorization: user.authorization });

    assert.equal(response.status, HTTP_TOO_MANY_REQUESTS);
  });

  it("keeps rate limits independent between endpoints and users", async () => {
    for (let index = 0; index < BILLING_WRITE_RATE_LIMIT; index += 1) {
      await requestJson(server, "POST", "/billing/portal", { authorization: user.authorization });
    }
    const otherUser = createTestUser();

    const otherEndpoint = await requestJson(server, "POST", "/billing/checkout", { authorization: user.authorization, body: { billingPeriod: "MONTHLY" } });
    const otherAccount = await requestJson(server, "POST", "/billing/portal", { authorization: otherUser.authorization });

    assert.equal(otherEndpoint.status, HTTP_OK);
    assert.equal(otherAccount.status, HTTP_NOT_FOUND);
  });

  for (const [path, body] of writeEndpoints) {
    it(`simulates a provider failure for ${path} without changing state`, async () => {
      testBillingService.setScenario(user.uuid, "pro-monthly");
      const initial = testBillingService.getSubscription(user.uuid);

      const response = await requestJson(server, "POST", path, { authorization: user.authorization, body, headers: { "x-mock-error": "true" } });

      assert.equal(response.status, HTTP_INTERNAL_SERVER_ERROR);
      assert.deepEqual(testBillingService.getSubscription(user.uuid), initial);
    });
  }
});
