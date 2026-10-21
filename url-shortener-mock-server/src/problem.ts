import { STATUS_CODES } from "node:http";
import type { Response } from "express";

export const PROBLEM_CONTENT_TYPE = "application/problem+json";

/** RFC 9457 problem details: the one error body every mock endpoint answers with. */
export interface ProblemDetails {
  type: "about:blank";
  title: string;
  status: number;
  detail: string;
}

export function createProblem(status: number, detail: string): ProblemDetails {
  return { type: "about:blank", title: STATUS_CODES[status] ?? "Error", status, detail };
}

export function sendProblem(res: Response, status: number, detail: string): void {
  res.status(status).type(PROBLEM_CONTENT_TYPE).json(createProblem(status, detail));
}
