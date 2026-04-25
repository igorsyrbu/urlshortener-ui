import type { Request, Response, NextFunction } from "express";

/**
 * Error simulation middleware.
 * If the request includes the header `x-mock-error: true`,
 * the server immediately responds with a 500 Internal Server Error.
 */
export function errorSimulation(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-mock-error"] === "true") {
    res.status(500).json({
      error: "Simulated server error",
      message: "The x-mock-error header was set to true",
    });
    return;
  }
  next();
}
