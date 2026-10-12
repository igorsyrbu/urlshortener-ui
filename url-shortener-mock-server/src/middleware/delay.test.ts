import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type { Request, Response } from "express";
import { delay } from "./delay";

const DELAY_MS = 250;
const DELAY_ENV_KEY = "MOCK_DELAY";
let originalDelay: string | undefined;
let nextCallCount: number;

function runDelay(): void {
  delay({} as Request, {} as Response, () => { nextCallCount++; });
}

beforeEach(() => {
  originalDelay = process.env[DELAY_ENV_KEY];
  nextCallCount = 0;
  mock.timers.enable({ apis: ["setTimeout"] });
});

afterEach(() => {
  mock.timers.reset();
  if (originalDelay === undefined) {
    delete process.env[DELAY_ENV_KEY];
  } else {
    process.env[DELAY_ENV_KEY] = originalDelay;
  }
});

describe("delay middleware", () => {
  it("continues immediately when MOCK_DELAY is not set", () => {
    delete process.env[DELAY_ENV_KEY];
    runDelay();
    assert.equal(nextCallCount, 1);
  });

  const immediateValues = ["0", "-100", "abc", ""];
  for (const value of immediateValues) {
    it(`continues immediately when MOCK_DELAY is "${value}"`, () => {
      process.env[DELAY_ENV_KEY] = value;
      runDelay();
      assert.equal(nextCallCount, 1);
    });
  }

  it("holds the request until the configured delay elapsed", () => {
    process.env[DELAY_ENV_KEY] = String(DELAY_MS);
    runDelay();
    assert.equal(nextCallCount, 0);
    mock.timers.tick(DELAY_MS - 1);
    assert.equal(nextCallCount, 0);
    mock.timers.tick(1);
    assert.equal(nextCallCount, 1);
  });

  it("reads the delay on every request", () => {
    process.env[DELAY_ENV_KEY] = String(DELAY_MS);
    runDelay();
    process.env[DELAY_ENV_KEY] = "0";
    runDelay();
    assert.equal(nextCallCount, 1);
  });
});
