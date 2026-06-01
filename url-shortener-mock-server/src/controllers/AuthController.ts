import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { getLoginPageHtml } from "../views/loginPage";
import { memoryStore } from "../services/MemoryStore";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const COOKIE_SAMESITE = (process.env.MOCK_COOKIE_SAMESITE || "lax") as "lax" | "strict" | "none";
const COOKIE_SECURE = process.env.MOCK_COOKIE_SECURE === "true";

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const key = parts.shift()?.trim() || "";
    list[key] = decodeURI(parts.join("="));
  });
  return list;
}

export class AuthController {
  static async ottGenerate(req: Request, res: Response) {
    res.status(200).json({ message: "Magic link sent" });
  }

  static async ottLogin(req: Request, res: Response) {
    res.redirect(`${FRONTEND_URL}/auth/exchange?code=mock-auth-code-${Date.now()}`);
  }

  static async codeExchange(req: Request, res: Response) {
    const code = (req.query.code as string) || "";
    let uuid = "";
    if (code.startsWith("mock-google-code-")) {
      uuid = code.replace("mock-google-code-", "");
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid || !uuidRegex.test(uuid)) {
      res.clearCookie("refresh_token");
      res.status(401).json({ error: "Unauthorized", message: "Missing or invalid user UUID." });
      return;
    }

    memoryStore.registerUserSession(uuid);

    res.cookie("refresh_token", `mock-refresh-token-${uuid}`, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ accessToken: authService.getMockAccessToken(uuid) });
  }

  static async tokenRefresh(req: Request, res: Response) {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies["refresh_token"] || "";

    let uuid = "";
    if (refreshToken.startsWith("mock-refresh-token-")) {
      uuid = refreshToken.replace("mock-refresh-token-", "");
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid || !uuidRegex.test(uuid)) {
      res.clearCookie("refresh_token");
      res.status(401).json({ error: "Unauthorized", message: "Missing or invalid refresh token." });
      return;
    }

    memoryStore.registerUserSession(uuid);

    res.json({ accessToken: authService.getMockAccessToken(uuid) });
  }

  static async oauth2Google(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/html");
    res.send(getLoginPageHtml(FRONTEND_URL));
  }
}
