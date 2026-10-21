import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";
import { createDelay } from "./delay";

const DELAY_MS = 250;
let nextCallCount: number;

function runDelay(delayMs: number): void {
  // The middleware reads neither the request nor the response.
  createDelay(delayMs)({} as Request, {} as Response, () => { nextCallCount++; });
}

beforeEach(() => {
  nextCallCount = 0;
  mock.timers.enable({ apis: ["setTimeout"] });
});

afterEach(() => {
  mock.timers.reset();
});

describe("delay middleware", () => {
  it("continues immediately without a delay", () => {
    runDelay(0);
    assert.equal(nextCallCount, 1);
  });

  it("holds the request until the configured delay elapsed", () => {
    runDelay(DELAY_MS);
    assert.equal(nextCallCount, 0);
    mock.timers.tick(DELAY_MS - 1);
    assert.equal(nextCallCount, 0);
    mock.timers.tick(1);
    assert.equal(nextCallCount, 1);
  });
});
