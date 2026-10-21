import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getAppContext } from "../app-context";
import type { AuthenticatedRequest } from "./authentication";
import {
  BILLING_READ_RATE_LIMIT, BILLING_RETRY_AFTER_HEADER, BILLING_WRITE_RATE_LIMIT,
  HTTP_TOO_MANY_REQUESTS, RATE_LIMIT_WINDOW_MS, SECOND_MS,
} from "../services/billing-constants";
import { sendProblem } from "../problem";

export type BillingBucketKind = "read" | "write";

const LIMITS: Record<BillingBucketKind, number> = {
  read: BILLING_READ_RATE_LIMIT,
  write: BILLING_WRITE_RATE_LIMIT,
};

interface RateLimitWindow {
  count: number;
  expiresAtMs: number;
}

/**
 * Fixed one-minute windows per user and named bucket. The bucket comes from the route, not from the request path:
 * Express routing ignores case and a trailing slash, so `/BILLING/PORTAL/` must count against `/billing/portal`.
 */
export class BillingRateLimiter {
  private readonly windows = new Map<string, RateLimitWindow>();
  private lastSweepMs = 0;

  constructor(private readonly now: () => number = Date.now) {}

  /** Counts the request and returns `null`, or returns the seconds until the window resets when it is over the limit. */
  take(uuid: string, bucket: string, kind: BillingBucketKind): number | null {
    const timestamp = this.now();
    this.sweepExpiredWindows(timestamp);
    const key = `${uuid}:${bucket}`;
    const current = this.windows.get(key);
    const window = current && current.expiresAtMs > timestamp
      ? current
      : { count: 0, expiresAtMs: timestamp + RATE_LIMIT_WINDOW_MS };
    this.windows.set(key, window);
    if (window.count >= LIMITS[kind]) return Math.ceil((window.expiresAtMs - timestamp) / SECOND_MS);
    window.count += 1;
    return null;
  }

  get trackedWindowCount(): number {
    return this.windows.size;
  }

  /** Only bounds memory (an expired window is already ignored by `take`), so once per window is enough. */
  private sweepExpiredWindows(timestamp: number): void {
    if (timestamp - this.lastSweepMs < RATE_LIMIT_WINDOW_MS) return;
    for (const [key, window] of this.windows) {
      if (window.expiresAtMs <= timestamp) this.windows.delete(key);
    }
    this.lastSweepMs = timestamp;
  }
}

/** Route middleware: `billingRateLimit("portal", "write")`. HEAD shares the GET bucket because the key has no method. */
export function billingRateLimit(bucket: string, kind: BillingBucketKind): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = (req as AuthenticatedRequest).user?.uuid;
    if (!uuid) {
      next();
      return;
    }
    const retryAfterSeconds = getAppContext(req).billingRateLimiter.take(uuid, bucket, kind);
    if (retryAfterSeconds === null) {
      next();
      return;
    }
    res.set(BILLING_RETRY_AFTER_HEADER, String(retryAfterSeconds)).set("Retry-After", String(retryAfterSeconds));
    sendProblem(res, HTTP_TOO_MANY_REQUESTS, "Too many billing requests. Please try again later.");
  };
}
