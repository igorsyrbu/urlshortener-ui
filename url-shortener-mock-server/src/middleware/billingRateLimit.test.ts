import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { createTestUser, startTestServer } from "../test-utils";
import { authentication } from "./authentication";
import { createBillingRateLimit } from "./billingRateLimit";
import {
  BILLING_RETRY_AFTER_HEADER, BILLING_WRITE_RATE_LIMIT,
  HTTP_OK, HTTP_TOO_MANY_REQUESTS, RATE_LIMIT_WINDOW_MS,
} from "../services/billing-constants";

describe("billingRateLimit", () => {
  it("accepts new requests exactly at the minute boundary", async () => {
    let nowMs = 0;
    const user = createTestUser();
    const app = express();
    app.post("/billing/portal", authentication, createBillingRateLimit(() => nowMs), (_req, res) => { res.json({ ok: true }); });
    const server = await startTestServer(app);
    const headers = { Authorization: user.authorization };

    try {
      for (let index = 0; index < BILLING_WRITE_RATE_LIMIT; index += 1) {
        assert.equal((await fetch(`${server.baseUrl}/billing/portal`, { method: "POST", headers })).status, HTTP_OK);
      }
      const limited = await fetch(`${server.baseUrl}/billing/portal`, { method: "POST", headers });
      assert.equal(limited.status, HTTP_TOO_MANY_REQUESTS);
      assert.equal(limited.headers.get(BILLING_RETRY_AFTER_HEADER), "60");

      nowMs = RATE_LIMIT_WINDOW_MS;
      const resumed = await fetch(`${server.baseUrl}/billing/portal`, { method: "POST", headers });

      assert.equal(resumed.status, HTTP_OK);
    } finally {
      await server.close();
    }
  });
});
