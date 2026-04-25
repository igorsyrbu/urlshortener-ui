import { Router } from "express";
import { ShortLinksController } from "../controllers/ShortLinksController";
import { authentication } from "../middleware/authentication";

const router = Router();

router.get("/shortlinks", authentication, ShortLinksController.getShortLinks);
router.get("/shortlinks/byIds", authentication, ShortLinksController.getShortLinksByIds);
router.post("/shortlinks", authentication, ShortLinksController.createShortLink);
router.put("/shortlinks", authentication, ShortLinksController.updateShortLink);
router.delete("/shortlinks/:id", authentication, ShortLinksController.deleteShortLink);
router.get("/longurl/title", authentication, ShortLinksController.getLongUrlTitle);

export default router;
