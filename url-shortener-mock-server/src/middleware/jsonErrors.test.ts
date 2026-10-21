import assert from "node:assert/strict";
import {describe, it} from "node:test";
import type {Request, Response} from "express";
import {jsonErrors} from "./jsonErrors";
import {createProblem} from "../problem";

function createResponse(): {res: Response; statusCode: () => number; body: () => unknown} {
  let statusCode = 0;
  let payload: unknown = null;
  const res = {
    headersSent: false,
    status(code: number) { statusCode = code; return this; },
    type() { return this; },
    json(data: unknown) { payload = data; return this; },
  } as unknown as Response;
  return {res, statusCode: () => statusCode, body: () => payload};
}

describe("json error middleware", () => {
  it("answers body-parser errors with their status and a fixed message instead of parser text", () => {
    const response = createResponse();
    const error = Object.assign(new SyntaxError("Expected property name or '}' in JSON at position 1"), {status: 400, type: "entity.parse.failed"});
    jsonErrors(error, {} as Request, response.res, () => undefined);
    assert.equal(response.statusCode(), 400);
    assert.deepEqual(response.body(), createProblem(400, "Malformed JSON body."));
  });

  it("names an oversized body", () => {
    const response = createResponse();
    const error = Object.assign(new Error("request entity too large"), {status: 413, type: "entity.too.large"});
    jsonErrors(error, {} as Request, response.res, () => undefined);
    assert.deepEqual(response.body(), createProblem(413, "Request body is too large."));
  });

  it("falls back to a 500 problem for unexpected failures", () => {
    const response = createResponse();
    jsonErrors(new Error(), {} as Request, response.res, () => undefined);
    assert.equal(response.statusCode(), 500);
    assert.deepEqual(response.body(), createProblem(500, "Unexpected mock server error"));
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
