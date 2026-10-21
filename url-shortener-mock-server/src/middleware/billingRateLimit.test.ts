import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { createApp } from "../app";
import { BillingRateLimiter } from "./billingRateLimit";
import { createTestUser, startTestServer, TEST_CONFIG, type TestServer, type TestUser } from "../test-utils";
import {
  BILLING_READ_RATE_LIMIT, BILLING_RETRY_AFTER_HEADER, BILLING_WRITE_RATE_LIMIT,
  HTTP_TOO_MANY_REQUESTS, RATE_LIMIT_WINDOW_MS, SECOND_MS,
} from "../services/billing-constants";

const USER = "user-a";
const OTHER_USER = "user-b";
const HTTP_OK = 200;

function createLimiter(): { limiter: BillingRateLimiter; setNow: (ms: number) => void } {
  let nowMs = 0;
  return { limiter: new BillingRateLimiter(() => nowMs), setNow: (ms) => { nowMs = ms; } };
}

function exhaust(limiter: BillingRateLimiter, uuid: string, bucket: string, limit: number): void {
  for (let index = 0; index < limit; index += 1) assert.equal(limiter.take(uuid, bucket, "write"), null);
}

describe("BillingRateLimiter", () => {
  it("allows the write limit, then answers with the seconds until the window resets", () => {
    const { limiter } = createLimiter();
    exhaust(limiter, USER, "portal", BILLING_WRITE_RATE_LIMIT);
    assert.equal(limiter.take(USER, "portal", "write"), RATE_LIMIT_WINDOW_MS / SECOND_MS);
  });

  it("allows sixty reads", () => {
    const { limiter } = createLimiter();
    for (let index = 0; index < BILLING_READ_RATE_LIMIT; index += 1) assert.equal(limiter.take(USER, "subscription", "read"), null);
    assert.notEqual(limiter.take(USER, "subscription", "read"), null);
  });

  it("rounds the retry delay up to whole seconds in the middle of a window", () => {
    const { limiter, setNow } = createLimiter();
    exhaust(limiter, USER, "portal", BILLING_WRITE_RATE_LIMIT);
    setNow(RATE_LIMIT_WINDOW_MS - SECOND_MS + 1);
    assert.equal(limiter.take(USER, "portal", "write"), 1);
  });

  it("starts a new window at the minute boundary", () => {
    const { limiter, setNow } = createLimiter();
    exhaust(limiter, USER, "portal", BILLING_WRITE_RATE_LIMIT);
    setNow(RATE_LIMIT_WINDOW_MS);
    assert.equal(limiter.take(USER, "portal", "write"), null);
  });

  it("keeps windows apart per user and per bucket", () => {
    const { limiter } = createLimiter();
    exhaust(limiter, USER, "portal", BILLING_WRITE_RATE_LIMIT);
    assert.equal(limiter.take(OTHER_USER, "portal", "write"), null);
    assert.equal(limiter.take(USER, "checkout", "write"), null);
  });

  it("drops expired windows once per window instead of on every request", () => {
    const { limiter, setNow } = createLimiter();
    limiter.take(USER, "portal", "write");
    setNow(RATE_LIMIT_WINDOW_MS / 2);
    limiter.take(OTHER_USER, "portal", "write");
    setNow(RATE_LIMIT_WINDOW_MS - 1);
    limiter.take(OTHER_USER, "portal", "write");
    assert.equal(limiter.trackedWindowCount, 2);
    setNow(RATE_LIMIT_WINDOW_MS);
    limiter.take(OTHER_USER, "portal", "write");
    assert.equal(limiter.trackedWindowCount, 1);
  });
});

describe("billing rate limit on the routes", () => {
  let server: TestServer;
  let user: TestUser;
  let setNow: (ms: number) => void;

  before(async () => {
    const created = createLimiter();
    setNow = created.setNow;
    server = await startTestServer(createApp({ config: TEST_CONFIG, billingRateLimiter: created.limiter }));
  });

  after(async () => {
    await server.close();
  });

  beforeEach(() => {
    user = createTestUser();
    setNow(0);
  });

  function send(method: string, path: string): Promise<Response> {
    return fetch(`${server.baseUrl}${path}`, { method, headers: { Authorization: user.authorization } });
  }

  it("shares one window across /billing/portal, /billing/portal/ and /BILLING/PORTAL", async () => {
    for (let index = 0; index < BILLING_WRITE_RATE_LIMIT; index += 1) {
      assert.notEqual((await send("POST", "/billing/portal")).status, HTTP_TOO_MANY_REQUESTS);
    }
    for (const variant of ["/billing/portal/", "/BILLING/PORTAL", "/Billing/Portal", "/BILLING/portal/"]) {
      const response = await send("POST", variant);
      assert.equal(response.status, HTTP_TOO_MANY_REQUESTS, variant);
      assert.equal(response.headers.get(BILLING_RETRY_AFTER_HEADER), "60");
    }
  });

  it("lets HEAD share the read window of GET instead of the write limit", async () => {
    for (let index = 0; index < BILLING_READ_RATE_LIMIT; index += 1) {
      assert.equal((await send("HEAD", "/billing/subscription")).status, HTTP_OK);
    }
    assert.equal((await send("HEAD", "/billing/subscription")).status, HTTP_TOO_MANY_REQUESTS);
    assert.equal((await send("GET", "/billing/subscription")).status, HTTP_TOO_MANY_REQUESTS);
  });

  it("serves reads again once the window has passed", async () => {
    for (let index = 0; index <= BILLING_READ_RATE_LIMIT; index += 1) await send("GET", "/billing/subscription");
    setNow(RATE_LIMIT_WINDOW_MS);
    assert.equal((await send("GET", "/billing/subscription")).status, HTTP_OK);
  });
});
