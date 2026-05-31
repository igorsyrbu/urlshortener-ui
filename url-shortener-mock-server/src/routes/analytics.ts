import { Router } from "express";
import { AnalyticsController } from "../controllers/AnalyticsController";
import { authentication } from "../middleware/authentication";

const router: Router = Router();

// Returns analytics data. Behavior depends on query params:
//   - groupBy: date, country, continent, device, os, referrer, top_link
//   - period: P7D, P30D, P90D (scales data)
//   - start/end: returns constant comparison value if no groupBy, else scales data
router.get("/analytics", authentication, AnalyticsController.getAnalytics);

export default router;
