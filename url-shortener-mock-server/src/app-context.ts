import type { Request } from "express";
import type { MockConfig } from "./config";
import type { BillingRateLimiter } from "./middleware/billingRateLimit";
import type { BillingService } from "./services/BillingService";

/** Per-app state and settings, so every `createApp()` (one per test file, one in `index.ts`) starts clean. */
export interface AppContext {
  config: MockConfig;
  billing: BillingService;
  billingRateLimiter: BillingRateLimiter;
  /** Email to the time (ms) when the next magic link may be requested. */
  magicLinkCooldowns: Map<string, number>;
}

declare global {
  // Express types `app.locals` through this interface; merging adds the context's type.
  namespace Express {
    interface Locals {
      context: AppContext;
    }
  }
}

export function getAppContext(req: Request): AppContext {
  return req.app.locals.context;
}
