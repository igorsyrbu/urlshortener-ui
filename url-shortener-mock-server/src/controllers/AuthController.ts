import { Request, Response } from "express";
import { authService } from "../services/AuthService";

export class AuthController {
  static async ottGenerate(req: Request, res: Response) {
    res.status(200).json({ message: "Magic link sent" });
  }

  static async ottLogin(req: Request, res: Response) {
    res.redirect(`http://localhost:3000/auth/exchange?code=mock-auth-code-${Date.now()}`);
  }

  static async codeExchange(req: Request, res: Response) {
    res.cookie("refresh_token", "mock-refresh-token-value", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({ accessToken: authService.getMockAccessToken() });
  }

  static async tokenRefresh(req: Request, res: Response) {
    res.json({ accessToken: authService.getMockAccessToken() });
  }

  static async oauth2Google(req: Request, res: Response) {
    res.redirect(`http://localhost:3000/auth/exchange?code=mock-google-code-${Date.now()}`);
  }
}
