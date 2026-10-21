import type { Request, Response, NextFunction } from "express";
import { sendProblem } from "../problem";

const HTTP_INTERNAL_SERVER_ERROR = 500;

/**
 * Error simulation middleware.
 * If the request includes the header `x-mock-error: true`,
 * the server immediately responds with a 500 Internal Server Error.
 */
export function errorSimulation(req: Request, res: Response, next: NextFunction): void {
  if (req.headers["x-mock-error"] === "true") {
    sendProblem(res, HTTP_INTERNAL_SERVER_ERROR, "Simulated server error: the x-mock-error header was set to true.");
    return;
  }
  next();
}
