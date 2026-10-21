import { Router } from "express";
import { BillingController } from "../controllers/BillingController";
import { authentication } from "../middleware/authentication";
import { billingRateLimit } from "../middleware/billingRateLimit";

const router: Router = Router();

router.get("/billing/subscription", authentication, billingRateLimit("subscription", "read"), BillingController.getSubscription);
router.post("/billing/checkout", authentication, billingRateLimit("checkout", "write"), BillingController.createCheckout);
router.post("/billing/portal", authentication, billingRateLimit("portal", "write"), BillingController.createPortal);
router.post("/billing/subscription/upgrade", authentication, billingRateLimit("upgrade", "write"), BillingController.scheduleUpgrade);
router.post("/mock/billing/scenario", authentication, BillingController.setScenario);
router.get("/mock/billing/checkout/:token", BillingController.showCheckout);
router.post("/mock/billing/checkout/:token", BillingController.completeCheckout);
router.get("/mock/billing/portal/:token", BillingController.showPortal);
router.post("/mock/billing/portal/:token", BillingController.updatePortal);
router.post("/mock/billing/portal/:token/scenario", BillingController.setPortalScenario);

export default router;
