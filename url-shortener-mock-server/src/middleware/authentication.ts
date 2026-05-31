import { Request, Response, NextFunction } from "express";
import { cleanupService } from "../services/CleanupService";

export interface AuthenticatedRequest extends Request {
  user?: {
    uuid: string;
  };
}

export function authentication(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Authorization header." });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Bearer token is empty." });
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
          (req as AuthenticatedRequest).user = { uuid };
          cleanupService.recordActivity(uuid);
          next();
          return;
        }
      }
    }
  } catch (err) {
    // Ignore error, proceed to unauthorized response
  }

  res.status(401).json({ error: "Unauthorized", message: "Missing or invalid user UUID." });
}
