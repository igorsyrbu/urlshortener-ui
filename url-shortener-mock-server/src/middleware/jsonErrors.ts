import type { NextFunction, Request, Response } from "express";
import { sendProblem } from "../problem";

const HTTP_INTERNAL_SERVER_ERROR = 500;
const UNEXPECTED_ERROR_DETAIL = "Unexpected mock server error";

/** body-parser errors carry a `type`; their own messages quote parser internals (`position 1`) and stay out of answers. */
const BODY_PARSER_DETAILS: Record<string, string> = {
  "entity.parse.failed": "Malformed JSON body.",
  "entity.too.large": "Request body is too large.",
  "encoding.unsupported": "Unsupported content encoding.",
  "charset.unsupported": "Unsupported charset.",
  "request.aborted": "Request was aborted.",
};

interface HttpError extends Error {
  status?: number;
  type?: string;
}

function readStatus(error: unknown): number {
  const status = (error as HttpError | undefined)?.status;
  return typeof status === "number" ? status : HTTP_INTERNAL_SERVER_ERROR;
}

function readDetail(error: unknown): string {
  const type = (error as HttpError | undefined)?.type;
  if (type && BODY_PARSER_DETAILS[type]) return BODY_PARSER_DETAILS[type];
  return error instanceof Error && error.message ? error.message : UNEXPECTED_ERROR_DETAIL;
}

/** Last in the chain: turns body-parser errors and unexpected failures into a problem-details answer, not an HTML page. */
export function jsonErrors(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  sendProblem(res, readStatus(error), readDetail(error));
}
