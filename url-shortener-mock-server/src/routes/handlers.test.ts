import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Router } from "express";
import abuseRoutes from "./abuse";
import analyticsRoutes from "./analytics";
import authRoutes from "./auth";
import billingRoutes from "./billing";
import shortLinksRoutes from "./shortlinks";
import tagsRoutes from "./tags";
import usersRoutes from "./users";

interface RouteLayer {
  route?: { path: string; stack: Array<{ method?: string; handle: (...args: unknown[]) => unknown }> };
}

const ROUTERS: Array<[string, Router]> = [
  ["abuse", abuseRoutes],
  ["analytics", analyticsRoutes],
  ["auth", authRoutes],
  ["billing", billingRoutes],
  ["shortlinks", shortLinksRoutes],
  ["tags", tagsRoutes],
  ["users", usersRoutes],
];

function isAsyncFunction(handler: (...args: unknown[]) => unknown): boolean {
  return handler.constructor.name === "AsyncFunction";
}

describe("route handlers", () => {
  for (const [name, router] of ROUTERS) {
    it(`${name}: every async handler goes through asyncHandler, so a rejection cannot end the process`, () => {
      // Express does not export its layer type; `stack` is its documented-by-use internal list of layers.
      const layers = (router as unknown as { stack: RouteLayer[] }).stack;
      const unwrapped = layers.flatMap((layer) => (layer.route?.stack ?? [])
        .filter((routeLayer) => isAsyncFunction(routeLayer.handle))
        .map((routeLayer) => `${routeLayer.method?.toUpperCase()} ${layer.route?.path}`));
      assert.deepEqual(unwrapped, []);
    });
  }
});
