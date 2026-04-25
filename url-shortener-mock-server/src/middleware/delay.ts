import type { Request, Response, NextFunction } from "express";

/**
 * Adds artificial latency to every response.
 * Controlled by the MOCK_DELAY environment variable (milliseconds).
 * Defaults to 0 (no delay) if not set.
 */
export function delay(req: Request, res: Response, next: NextFunction): void {
  const ms = parseInt(process.env.MOCK_DELAY || "0", 10);
  if (ms > 0) {
    setTimeout(next, ms);
  } else {
    next();
  }
}
