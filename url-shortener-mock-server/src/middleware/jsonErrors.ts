import type { NextFunction, Request, Response } from "express";

interface HttpError extends Error {
  status?: number;
}

/**
 * Converts body-parser errors (e.g. oversized payloads) and unexpected
 * failures to JSON so API clients receive a readable `detail` instead
 * of an HTML error page.
 */
export function jsonErrors(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    _next(error);
    return;
  }
  const status = typeof (error as HttpError | undefined)?.status === "number"
    ? (error as HttpError).status as number
    : 500;
  const detail = error instanceof Error && error.message ? error.message : "Unexpected mock server error";
  res.status(status).json({ detail });
}
