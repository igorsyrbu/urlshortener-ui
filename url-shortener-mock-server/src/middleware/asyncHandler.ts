import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Express 4 ignores a rejected promise from a handler, and Node then ends the process on the unhandled rejection.
 * Forwarding the rejection to `next` hands it to `jsonErrors` instead.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
