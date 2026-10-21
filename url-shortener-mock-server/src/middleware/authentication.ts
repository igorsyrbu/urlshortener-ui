import { Request, Response, NextFunction } from "express";
import { memoryStore } from "../services/MemoryStore";
import { sendProblem } from "../problem";

export interface AuthenticatedRequest extends Request {
  user?: {
    uuid: string;
  };
}

export function authentication(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendProblem(res, 401, "Missing or invalid Authorization header.");
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    sendProblem(res, 401, "Bearer token is empty.");
    return;
  }

  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadJson);

      if (payload.sub && payload.sub.startsWith("mock-user-")) {
        const uuid = payload.sub.replace("mock-user-", "");
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(uuid)) {
          if (!memoryStore.hasUserState(uuid)) {
            sendProblem(res, 401, "User not logged in.");
            return;
          }
          (req as AuthenticatedRequest).user = { uuid };
          next();
          return;
        }
      }
    }
  } catch (err) {
    // Ignore error, proceed to unauthorized response
  }

  sendProblem(res, 401, "Missing or invalid user UUID.");
}

/** For handlers behind `authentication` only; without it this is a wiring bug, answered as a 500 by `jsonErrors`. */
export function requireUserUuid(req: Request): string {
  const uuid = (req as AuthenticatedRequest).user?.uuid;
  if (!uuid) throw new Error("This route is missing the authentication middleware.");
  return uuid;
}
