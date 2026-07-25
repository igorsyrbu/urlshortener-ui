import { Router } from "express";
import { AbuseReportsController } from "../controllers/AbuseReportsController";

const router: Router = Router();

router.post("/public/abuse/report", AbuseReportsController.submitReport);

export default router;
