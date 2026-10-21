import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Adds artificial latency to every response (`MOCK_DELAY`, milliseconds; 0 turns it off). */
export function createDelay(delayMs: number): RequestHandler {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (delayMs > 0) {
      setTimeout(next, delayMs);
      return;
    }
    next();
  };
}
