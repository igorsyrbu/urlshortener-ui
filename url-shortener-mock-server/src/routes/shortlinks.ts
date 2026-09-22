import { Router } from "express";
import { ShortLinksController } from "../controllers/ShortLinksController";
import { authentication } from "../middleware/authentication";

const router: Router = Router();

router.get("/public/preview/:key", ShortLinksController.getPublicLinkPreview);
router.get("/shortlinks", authentication, ShortLinksController.getShortLinks);
router.get("/shortlinks/random", authentication, ShortLinksController.getRandomKey);
router.get("/shortlinks/export", authentication, ShortLinksController.exportShortLinks);
router.post("/shortlinks/import", authentication, ShortLinksController.importShortLinks);
router.get("/shortlinks/byIds", authentication, ShortLinksController.getShortLinksByIds);
router.get("/shortlinks/:key/exists", authentication, ShortLinksController.keyExists);
router.post("/shortlinks", authentication, ShortLinksController.createShortLink);
router.put("/shortlinks", authentication, ShortLinksController.updateShortLink);
router.delete("/shortlinks/:id", authentication, ShortLinksController.deleteShortLink);
router.get("/longurl/title", authentication, ShortLinksController.getLongUrlTitle);
router.post("/urlcleaner", authentication, ShortLinksController.cleanUrl);

export default router;
