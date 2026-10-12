import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { requestJson, startTestServer, type TestServer } from "../test-utils";

const HTTP_CREATED = 201;
const HTTP_UNPROCESSABLE_ENTITY = 422;
const SHORT_URL = "https://sho.rt/bad";
const DESCRIPTION_MAX_LENGTH = 2000;
const REASONS = [
  "SPAM_OR_MISLEADING",
  "PHISHING_OR_MALWARE",
  "HARASSMENT_OR_THREATS",
  "ILLEGAL_CONTENT",
  "COPYRIGHT_OR_TRADEMARK",
  "IMPERSONATION",
  "OTHER",
];
let server: TestServer;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

function submitReport(body: unknown) {
  return requestJson(server, "POST", "/public/abuse/report", { body });
}

describe("POST /public/abuse/report", () => {
  for (const reason of REASONS) {
    it(`accepts the ${reason} reason`, async () => {
      const response = await submitReport({ shortUrl: SHORT_URL, reason });
      assert.equal(response.status, HTTP_CREATED);
      assert.equal((response.body as { status: string }).status, "RECEIVED");
    });
  }

  it("echoes optional fields and omits them when empty", async () => {
    const full = await submitReport({ shortUrl: SHORT_URL, reason: "OTHER", reporterEmail: "a@b.c", description: "details" });
    assert.deepEqual(
      { email: (full.body as Record<string, unknown>).reporterEmail, description: (full.body as Record<string, unknown>).description },
      { email: "a@b.c", description: "details" },
    );
    const minimal = await submitReport({ shortUrl: SHORT_URL, reason: "OTHER", reporterEmail: "", description: "" });
    assert.equal("reporterEmail" in (minimal.body as object), false);
    assert.equal("description" in (minimal.body as object), false);
  });

  it("accepts a description at the maximum length", async () => {
    const response = await submitReport({ shortUrl: SHORT_URL, reason: "OTHER", description: "x".repeat(DESCRIPTION_MAX_LENGTH) });
    assert.equal(response.status, HTTP_CREATED);
  });

  const invalidReports: Array<[string, unknown]> = [
    ["a missing short url", { reason: "OTHER" }],
    ["a missing reason", { shortUrl: SHORT_URL }],
    ["an unknown reason", { shortUrl: SHORT_URL, reason: "BORING" }],
    ["a description over the limit", { shortUrl: SHORT_URL, reason: "OTHER", description: "x".repeat(DESCRIPTION_MAX_LENGTH + 1) }],
  ];
  for (const [description, body] of invalidReports) {
    it(`rejects ${description} with 422`, async () => {
      assert.equal((await submitReport(body)).status, HTTP_UNPROCESSABLE_ENTITY);
    });
  }
});
