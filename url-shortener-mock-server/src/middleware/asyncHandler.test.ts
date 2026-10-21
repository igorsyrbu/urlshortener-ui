import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";
import { asyncHandler } from "./asyncHandler";
import { jsonErrors } from "./jsonErrors";
import { requestJson, startTestServer, type TestServer } from "../test-utils";

const HTTP_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;

let server: TestServer;

before(async () => {
  const app = express();
  app.get("/rejects", asyncHandler(async () => {
    await Promise.resolve();
    throw new Error("handler failed");
  }));
  app.get("/ok", asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  }));
  app.use(jsonErrors);
  server = await startTestServer(app);
});

after(async () => {
  await server.close();
});

describe("asyncHandler", () => {
  it("turns a rejected handler into a 500 JSON answer and keeps serving", async () => {
    const failed = await requestJson(server, "GET", "/rejects");
    const next = await requestJson(server, "GET", "/ok");
    assert.equal(failed.status, HTTP_INTERNAL_SERVER_ERROR);
    assert.deepEqual(failed.body, { detail: "handler failed" });
    assert.equal(next.status, HTTP_OK);
  });
});
