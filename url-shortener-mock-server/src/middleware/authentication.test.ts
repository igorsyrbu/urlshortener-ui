import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import type { Request, Response } from "express";
import { createTestUser } from "../test-utils";
import { authentication, type AuthenticatedRequest } from "./authentication";

const HTTP_UNAUTHORIZED = 401;

interface MiddlewareRun {
  request: Request;
  statusCode: number | null;
  body: unknown;
  hasCalledNext: boolean;
}

function encodeSegment(value: unknown): string {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

function createTokenWithPayload(payload: unknown): string {
  return `${encodeSegment({ alg: "none" })}.${encodeSegment(payload)}.signature`;
}

function runAuthentication(authorization?: string): MiddlewareRun {
  const request = { headers: authorization === undefined ? {} : { authorization } } as unknown as Request;
  const run: MiddlewareRun = { request, statusCode: null, body: null, hasCalledNext: false };
  const res = {
    status(code: number) { run.statusCode = code; return this; },
    json(data: unknown) { run.body = data; return this; },
  } as unknown as Response;
  authentication(request, res, () => { run.hasCalledNext = true; });
  return run;
}

function expectUnauthorized(run: MiddlewareRun, message: string): void {
  assert.equal(run.hasCalledNext, false);
  assert.equal(run.statusCode, HTTP_UNAUTHORIZED);
  assert.deepEqual(run.body, { error: "Unauthorized", message });
}

describe("authentication middleware", () => {
  it("attaches the uuid of a logged-in user and continues", () => {
    const user = createTestUser();
    const run = runAuthentication(user.authorization);
    assert.equal(run.hasCalledNext, true);
    assert.deepEqual((run.request as AuthenticatedRequest).user, { uuid: user.uuid });
  });

  const missingHeaderCases: Array<[string, string | undefined]> = [
    ["the header is missing", undefined],
    ["the scheme is not Bearer", "Basic abc"],
    ["the scheme is lower-case", "bearer abc"],
  ];
  for (const [description, header] of missingHeaderCases) {
    it(`rejects the request when ${description}`, () => {
      expectUnauthorized(runAuthentication(header), "Missing or invalid Authorization header.");
    });
  }

  it("rejects an empty bearer token", () => {
    expectUnauthorized(runAuthentication("Bearer    "), "Bearer token is empty.");
  });

  const malformedTokens: Array<[string, string]> = [
    ["a token without three parts", "Bearer only.two"],
    ["a payload that is not JSON", `Bearer a.${encodeSegment("not json")}.c`],
    ["a JSON null payload", `Bearer ${createTokenWithPayload(null)}`],
    ["a payload without subject", `Bearer ${createTokenWithPayload({})}`],
    ["a subject without the mock prefix", `Bearer ${createTokenWithPayload({ sub: `user-${randomUUID()}` })}`],
    ["a subject that is not a uuid", `Bearer ${createTokenWithPayload({ sub: "mock-user-123" })}`],
    ["a non-string subject", `Bearer ${createTokenWithPayload({ sub: 42 })}`],
  ];
  for (const [description, header] of malformedTokens) {
    it(`rejects ${description}`, () => {
      expectUnauthorized(runAuthentication(header), "Missing or invalid user UUID.");
    });
  }

  it("rejects a well-formed token of a user who never logged in", () => {
    const header = `Bearer ${createTokenWithPayload({ sub: `mock-user-${randomUUID()}` })}`;
    expectUnauthorized(runAuthentication(header), "User not logged in.");
  });

  it("does not verify the signature or expiry", () => {
    const user = createTestUser();
    const header = `Bearer ${createTokenWithPayload({ sub: `mock-user-${user.uuid}`, exp: 1 })}`;
    assert.equal(runAuthentication(header).hasCalledNext, true);
  });
});
