import assert from "node:assert/strict";
import {describe, it} from "node:test";
import type {Request, Response} from "express";
import {jsonErrors} from "./jsonErrors";

function createResponse(): {res: Response; statusCode: () => number; body: () => unknown} {
  let statusCode = 0;
  let payload: unknown = null;
  const res = {
    headersSent: false,
    status(code: number) { statusCode = code; return this; },
    json(data: unknown) { payload = data; return this; },
  } as unknown as Response;
  return {res, statusCode: () => statusCode, body: () => payload};
}

describe("json error middleware", () => {
  it("maps body-parser errors to their status with a readable detail", () => {
    const response = createResponse();
    const error = Object.assign(new Error("request entity too large"), {status: 413});
    jsonErrors(error, {} as Request, response.res, () => undefined);
    assert.equal(response.statusCode(), 413);
    assert.deepEqual(response.body(), {detail: "request entity too large"});
  });

  it("falls back to a 500 JSON error for unexpected failures", () => {
    const response = createResponse();
    jsonErrors(new Error(), {} as Request, response.res, () => undefined);
    assert.equal(response.statusCode(), 500);
    assert.deepEqual(response.body(), {detail: "Unexpected mock server error"});
  });

  it("delegates to the default handler when the response has already started", () => {
    const response = createResponse();
    (response.res as {headersSent: boolean}).headersSent = true;
    const error = new Error("late failure");
    let forwardedError: unknown = null;
    jsonErrors(error, {} as Request, response.res, (forwarded) => { forwardedError = forwarded; });
    assert.equal(forwardedError, error);
    assert.equal(response.statusCode(), 0);
  });
});
