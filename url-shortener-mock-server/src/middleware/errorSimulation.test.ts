import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { errorSimulation } from "./errorSimulation";

const HTTP_INTERNAL_SERVER_ERROR = 500;

function createRequest(headers: Record<string, string>): Request {
  return { headers } as unknown as Request;
}

function createResponse(): { res: Response; statusCode: () => number | null; body: () => unknown } {
  let statusCode: number | null = null;
  let payload: unknown = null;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(data: unknown) { payload = data; return this; },
  } as unknown as Response;
  return { res, statusCode: () => statusCode, body: () => payload };
}

function runMiddleware(headers: Record<string, string>): { response: ReturnType<typeof createResponse>; hasCalledNext: boolean } {
  const response = createResponse();
  let hasCalledNext = false;
  errorSimulation(createRequest(headers), response.res, () => { hasCalledNext = true; });
  return { response, hasCalledNext };
}

describe("error simulation middleware", () => {
  it("responds with a simulated 500 when x-mock-error is true", () => {
    const { response, hasCalledNext } = runMiddleware({ "x-mock-error": "true" });
    assert.equal(hasCalledNext, false);
    assert.equal(response.statusCode(), HTTP_INTERNAL_SERVER_ERROR);
    assert.deepEqual(response.body(), {
      error: "Simulated server error",
      message: "The x-mock-error header was set to true",
    });
  });

  const passThroughHeaders: Array<[string, Record<string, string>]> = [
    ["the header is absent", {}],
    ["the header is false", { "x-mock-error": "false" }],
    ["the header value differs in case", { "x-mock-error": "TRUE" }],
  ];
  for (const [description, headers] of passThroughHeaders) {
    it(`passes the request through when ${description}`, () => {
      const { response, hasCalledNext } = runMiddleware(headers);
      assert.equal(hasCalledNext, true);
      assert.equal(response.statusCode(), null);
    });
  }
});
