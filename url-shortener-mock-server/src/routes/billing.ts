import { Router } from "express";
import { BillingController } from "../controllers/BillingController";
import { authentication } from "../middleware/authentication";
import { billingRateLimit } from "../middleware/billingRateLimit";
import { billingTrace } from "../middleware/billingTrace";

const router: Router = Router();
router.use("/billing", billingTrace);

router.get("/billing/subscription", authentication, billingRateLimit, BillingController.getSubscription);
router.post("/billing/checkout", authentication, billingRateLimit, BillingController.createCheckout);
router.post("/billing/portal", authentication, billingRateLimit, BillingController.createPortal);
router.post("/billing/subscription/upgrade", authentication, billingRateLimit, BillingController.scheduleUpgrade);
router.post("/mock/billing/scenario", authentication, BillingController.setScenario);
router.get("/mock/billing/checkout/:token", BillingController.showCheckout);
router.post("/mock/billing/checkout/:token", BillingController.completeCheckout);
router.get("/mock/billing/portal/:token", BillingController.showPortal);
router.post("/mock/billing/portal/:token", BillingController.updatePortal);
router.post("/mock/billing/portal/:token/scenario", BillingController.setPortalScenario);

export default router;
