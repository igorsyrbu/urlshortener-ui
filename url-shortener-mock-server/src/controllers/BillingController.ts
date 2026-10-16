import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authentication";
import { billingService, BillingError } from "../services/BillingService";
import {
  HTTP_BAD_REQUEST, HTTP_GONE, HTTP_SEE_OTHER, HTTP_UNAUTHORIZED, SECOND_MS,
  isBillingPeriod, isBillingScenario, isPortalAction, isPortalExpiryMode,
  type BillingSession,
} from "../services/billing-constants";
import { renderBillingPage } from "../views/billingPage";

function getUserUuid(req: AuthenticatedRequest): string {
  const uuid = req.user?.uuid;
  if (!uuid) throw new BillingError(HTTP_UNAUTHORIZED, "Authentication is required.");
  return uuid;
}

function handleBillingResponse(res: Response, handleResponse: () => void): void {
  res.set("Cache-Control", "no-store");
  try {
    handleResponse();
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    res.status(error.status).json({ detail: error.message });
  }
}

function getSession(req: Request, kind: BillingSession["kind"]): BillingSession {
  const session = billingService.getSession(req.params.token, kind);
  if (!session) throw new BillingError(HTTP_GONE, "This billing session is missing or expired. Open a fresh link from the app.");
  return session;
}

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getSessionUrl(req: Request, session: BillingSession): string {
  const origin = (process.env.MOCK_PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return `${origin}/mock/billing/${session.kind}/${session.token}`;
}

function sendSessionPage(res: Response, session: BillingSession, message?: string): void {
  res.set("Referrer-Policy", "no-referrer").type("html").send(renderBillingPage({
    session, subscription: billingService.getSubscription(session.uuid), frontendUrl: getFrontendUrl(), message,
  }));
}

export class BillingController {
  static getSubscription(req: Request, res: Response): void {
    handleBillingResponse(res, () => res.json(billingService.getSubscription(getUserUuid(req))));
  }

  static createCheckout(req: Request, res: Response): void {
    handleBillingResponse(res, () => {
      const period: unknown = req.body?.billingPeriod;
      if (!isBillingPeriod(period)) throw new BillingError(HTTP_BAD_REQUEST, "billingPeriod must be MONTHLY or YEARLY.");
      const session = billingService.createCheckout(getUserUuid(req), period);
      res.json({ url: getSessionUrl(req, session) });
    });
  }

  static createPortal(req: Request, res: Response): void {
    handleBillingResponse(res, () => {
      const uuid = getUserUuid(req);
      const session = billingService.createPortal(uuid);
      const expiryMode = billingService.getState(uuid).portalExpiryMode;
      const expiresInSeconds = expiryMode === "invalid"
        ? "not-a-number"
        : Math.max(0, Math.floor((session.expiresAtMs - Date.now()) / SECOND_MS));
      res.json({ url: getSessionUrl(req, session), ...(expiryMode === "omitted" ? {} : { expiresInSeconds }) });
    });
  }

  static scheduleUpgrade(req: Request, res: Response): void {
    handleBillingResponse(res, () => res.json(billingService.scheduleYearlyUpgrade(getUserUuid(req))));
  }

  static setScenario(req: Request, res: Response): void {
    handleBillingResponse(res, () => {
      const scenario: unknown = req.body?.scenario;
      const expiryMode: unknown = req.body?.portalExpiryMode;
      if (!isBillingScenario(scenario)) throw new BillingError(HTTP_BAD_REQUEST, "Unknown billing scenario.");
      if (expiryMode !== undefined && !isPortalExpiryMode(expiryMode)) throw new BillingError(HTTP_BAD_REQUEST, "Unknown portal expiry mode.");
      billingService.setScenario(getUserUuid(req), scenario, expiryMode);
      res.json(billingService.getSubscription(getUserUuid(req)));
    });
  }

  static showCheckout(req: Request, res: Response): void {
    handleBillingResponse(res, () => sendSessionPage(res, getSession(req, "checkout")));
  }

  static completeCheckout(req: Request, res: Response): void {
    handleBillingResponse(res, () => {
      billingService.completeCheckout(getSession(req, "checkout"));
      res.redirect(HTTP_SEE_OTHER, `${getFrontendUrl()}/settings/billing`);
    });
  }

  static showPortal(req: Request, res: Response): void {
    handleBillingResponse(res, () => sendSessionPage(res, getSession(req, "portal")));
  }

  static updatePortal(req: Request, res: Response): void {
    handleBillingResponse(res, () => {
      const session = getSession(req, "portal");
      const action: unknown = req.body?.action;
      if (!isPortalAction(action)) throw new BillingError(HTTP_BAD_REQUEST, "Unknown portal action.");
      billingService.applyPortalAction(session.uuid, action);
      sendSessionPage(res, session, "Subscription updated. Return to your app tab to see the change.");
    });
  }

  static setPortalScenario(req: Request, res: Response): void {
    handleBillingResponse(res, () => {
      const session = getSession(req, "portal");
      const scenario: unknown = req.body?.scenario;
      if (!isBillingScenario(scenario)) throw new BillingError(HTTP_BAD_REQUEST, "Unknown billing scenario.");
      billingService.setScenario(session.uuid, scenario);
      res.redirect(HTTP_SEE_OTHER, `${getFrontendUrl()}/settings/billing`);
    });
  }
}
