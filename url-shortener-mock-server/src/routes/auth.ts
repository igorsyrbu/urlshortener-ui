import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

const router = Router();

// Generates a mock magic-link (One-Time Token) for a given email/username.
router.post("/ott/generate", AuthController.ottGenerate);

// Validates the OTT token. In reality this redirects; mock returns the auth exchange redirect.
router.post("/ott/login", AuthController.ottLogin);

// Exchanges the mock authorization code for actual access/refresh JWT tokens.
router.get("/auth/code/exchange", AuthController.codeExchange);

// Issues a new access token
router.post("/token/refresh", AuthController.tokenRefresh);

// Simulates the start of Google OAuth2. Redirects straight to the exchange page with a mock code.
router.get("/oauth2/authorization/google", AuthController.oauth2Google);

export default router;
