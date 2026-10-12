import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";
import { startTestServer, type TestServer } from "../test-utils";
import { cors } from "./cors";

const ORIGIN = "http://localhost:3000";
const HTTP_NO_CONTENT = 204;
let server: TestServer;

before(async () => {
  const app = express();
  app.use(cors);
  app.get("/ping", (_req, res) => { res.json({ ok: true }); });
  server = await startTestServer(app);
});

after(async () => {
  await server.close();
});

describe("cors middleware", () => {
  it("reflects the request origin and allows credentials", async () => {
    const response = await fetch(`${server.baseUrl}/ping`, { headers: { Origin: ORIGIN } });
    assert.equal(response.headers.get("access-control-allow-origin"), ORIGIN);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  });

  it("answers preflight requests with the allowed methods and headers", async () => {
    const response = await fetch(`${server.baseUrl}/ping`, {
      method: "OPTIONS",
      headers: { Origin: ORIGIN, "Access-Control-Request-Method": "PUT" },
    });
    assert.equal(response.status, HTTP_NO_CONTENT);
    assert.equal(response.headers.get("access-control-allow-methods"), "GET,POST,PUT,DELETE,OPTIONS");
    assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type,Authorization,x-mock-error");
  });
});
