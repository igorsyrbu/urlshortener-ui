import crypto from "crypto";
import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { getLoginPageHtml } from "../views/loginPage";
import { memoryStore } from "../services/MemoryStore";
import { getAppContext } from "../app-context";
import { sendProblem } from "../problem";

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SECOND_MS = 1000;

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const key = parts.shift()?.trim() || "";
    list[key] = decodeCookieValue(parts.join("="));
  });
  return list;
}

/** A malformed escape (`%E0%A4%A`) makes `decodeURI` throw; any client can send one. */
function decodeCookieValue(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

export class AuthController {
  static ottGenerate(req: Request, res: Response) {
    const email = req.body.username as string | undefined;
    if (!email) {
      sendProblem(res, 400, "Missing username");
      return;
    }

    const { config, magicLinkCooldowns } = getAppContext(req);
    if (config.magicLinkCooldown.enabled) {
      const now = Date.now();
      const expiry = magicLinkCooldowns.get(email);

      if (expiry && expiry > now) {
        const remainingSeconds = Math.ceil((expiry - now) / SECOND_MS);
        res.setHeader("Retry-After", String(remainingSeconds));
        sendProblem(res, 429, `Please wait ${remainingSeconds} seconds before trying again.`);
        return;
      }

      magicLinkCooldowns.set(email, now + config.magicLinkCooldown.seconds * SECOND_MS);
    }
    res.status(200).json({ message: "Magic link sent" });
  }

  static ottLogin(req: Request, res: Response) {
    const { loginType, token, email, code } = req.body as {
      loginType?: string;
      token?: string;
      email?: string;
      code?: string;
    };

    if (loginType === "token") {
      if (!token || !email) {
        sendProblem(res, 400, "Missing token or email");
        return;
      }
    } else if (loginType === "otp") {
      if (!email || !code) {
        sendProblem(res, 400, "Missing email or code");
        return;
      }
    } else {
      sendProblem(res, 400, "Missing or invalid loginType");
      return;
    }

    const uuid = crypto.randomUUID();
    res.redirect(`${getAppContext(req).config.frontendUrl}/auth/exchange?code=mock-auth-code-${uuid}`);
  }

  static codeExchange(req: Request, res: Response) {
    const code = (req.query.code as string) || "";
    let uuid = "";
    if (code.startsWith("mock-google-code-")) {
      uuid = code.replace("mock-google-code-", "");
    } else if (code.startsWith("mock-auth-code-")) {
      uuid = code.replace("mock-auth-code-", "");
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid || !uuidRegex.test(uuid)) {
      res.clearCookie("refresh_token");
      sendProblem(res, 401, "Missing or invalid user UUID.");
      return;
    }

    memoryStore.registerUserSession(uuid);

    const { cookie } = getAppContext(req).config;
    res.cookie("refresh_token", `mock-refresh-token-${uuid}`, {
      httpOnly: true,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    res.json({ accessToken: authService.getMockAccessToken(uuid) });
  }

  static tokenRefresh(req: Request, res: Response) {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies["refresh_token"] || "";

    let uuid = "";
    if (refreshToken.startsWith("mock-refresh-token-")) {
      uuid = refreshToken.replace("mock-refresh-token-", "");
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid || !uuidRegex.test(uuid)) {
      res.clearCookie("refresh_token");
      sendProblem(res, 401, "Missing or invalid refresh token.");
      return;
    }

    memoryStore.registerUserSession(uuid);

    res.json({ accessToken: authService.getMockAccessToken(uuid) });
  }

  static oauth2Google(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/html");
    res.send(getLoginPageHtml(getAppContext(req).config.frontendUrl));
  }
}
