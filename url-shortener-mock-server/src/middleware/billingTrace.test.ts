import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { startTestServer } from "../test-utils";
import { createBillingTrace } from "./billingTrace";

const HTTP_OK = 200;

describe("billing trace", () => {
  for (const isEnabled of [true, false]) {
    it(`${isEnabled ? "records" : "omits"} request outcomes without query strings or credentials`, async () => {
      const output: string[] = [];
      const app = express();
      app.use(createBillingTrace(isEnabled, (line: string): void => { output.push(line); }));
      app.get("/billing/subscription", (_req, res) => { res.json({ plan: "FREE" }); });
      const server = await startTestServer(app);

      try {
        const response = await fetch(`${server.baseUrl}/billing/subscription?token=sensitive`, { headers: { Authorization: "Bearer sensitive" } });

        assert.equal(response.status, HTTP_OK);
        assert.deepEqual(output, isEnabled ? ["[mock billing] GET /billing/subscription 200\n"] : []);
      } finally {
        await server.close();
      }
    });
  }
});
