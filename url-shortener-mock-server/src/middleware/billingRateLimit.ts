import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "./authentication";
import {
  BILLING_READ_RATE_LIMIT, BILLING_RETRY_AFTER_HEADER, BILLING_WRITE_RATE_LIMIT,
  HTTP_TOO_MANY_REQUESTS, RATE_LIMIT_WINDOW_MS, SECOND_MS,
} from "../services/billing-constants";

interface RateLimitWindow {
  count: number;
  expiresAtMs: number;
}

export function createBillingRateLimit(now: () => number = Date.now): (req: Request, res: Response, next: NextFunction) => void {
  const windows = new Map<string, RateLimitWindow>();
  return function billingRateLimit(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const uuid = req.user?.uuid;
    if (!uuid) { next(); return; }
    const timestamp = now();
    for (const [key, window] of windows) {
      if (window.expiresAtMs <= timestamp) windows.delete(key);
    }
    const key = `${uuid}:${req.method}:${req.path}`;
    const window = windows.get(key) ?? { count: 0, expiresAtMs: timestamp + RATE_LIMIT_WINDOW_MS };
    windows.set(key, window);
    const limit = req.method === "GET" ? BILLING_READ_RATE_LIMIT : BILLING_WRITE_RATE_LIMIT;
    if (window.count >= limit) {
      const retryAfter = Math.ceil((window.expiresAtMs - timestamp) / SECOND_MS);
      res.set(BILLING_RETRY_AFTER_HEADER, String(retryAfter)).set("Retry-After", String(retryAfter));
      res.status(HTTP_TOO_MANY_REQUESTS).json({ detail: "Too many billing requests. Please try again later." });
      return;
    }
    window.count += 1;
    next();
  };
}

export const billingRateLimit = createBillingRateLimit();
