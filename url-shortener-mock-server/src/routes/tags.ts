import { Router } from "express";
import { TagsController } from "../controllers/TagsController";
import { authentication } from "../middleware/authentication";

const router = Router();

router.get("/tags", authentication, TagsController.getTags);
router.post("/tags", authentication, TagsController.createTag);
router.put("/tags", authentication, TagsController.updateTag);
router.delete("/tags/:id", authentication, TagsController.deleteTag);

export default router;
