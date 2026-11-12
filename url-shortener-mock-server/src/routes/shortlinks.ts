import { Router } from "express";
import { ShortLinksController } from "../controllers/ShortLinksController";
import { asyncHandler } from "../middleware/asyncHandler";
import { authentication } from "../middleware/authentication";
import { UUID_PATTERN_SOURCE } from "../utils/uuid";

// The UUID constraint keeps `/shortlinks/random`, `/export` and `/byIds` out of the by-id route.
const UUID_PATH_PATTERN = UUID_PATTERN_SOURCE.replace(/^\^|\$$/g, "");

const router: Router = Router();

router.get("/public/preview/:key", asyncHandler(ShortLinksController.getPublicLinkPreview));
router.post("/public/shortlinks/:key/unlock", ShortLinksController.unlockPublicLink);
router.get("/shortlinks", authentication, ShortLinksController.getShortLinks);
router.get("/shortlinks/random", authentication, ShortLinksController.getRandomKey);
router.get("/shortlinks/export", authentication, ShortLinksController.exportShortLinks);
router.post("/shortlinks/import", authentication, ShortLinksController.importShortLinks);
router.get("/shortlinks/import/updates", authentication, ShortLinksController.getImportUpdates);
router.get("/shortlinks/byIds", authentication, ShortLinksController.getShortLinksByIds);
router.get(`/shortlinks/:id(${UUID_PATH_PATTERN})`, authentication, ShortLinksController.getShortLinkById);
router.get("/shortlinks/:key/exists", authentication, ShortLinksController.keyExists);
router.post("/shortlinks", authentication, ShortLinksController.createShortLink);
router.put("/shortlinks", authentication, ShortLinksController.updateShortLink);
router.delete("/shortlinks/:id", authentication, ShortLinksController.deleteShortLink);
router.get("/longurl/title", authentication, asyncHandler(ShortLinksController.getLongUrlTitle));
router.post("/urlcleaner", authentication, ShortLinksController.cleanUrl);

export default router;
