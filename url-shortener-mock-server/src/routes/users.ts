import { Router } from "express";
import { UsersController } from "../controllers/UsersController";
import { authentication } from "../middleware/authentication";

const router = Router();

router.get("/users/me", authentication, UsersController.getCurrentUser);

router.put("/users/me/name", authentication, UsersController.updateCurrentUserName);

router.get("/users/sessions", authentication, UsersController.getSessions);

router.delete("/users/sessions/current", authentication, UsersController.deleteCurrentSession);

router.delete("/users/sessions/other", authentication, UsersController.deleteOtherSessions);

router.delete("/users/sessions/:id", authentication, UsersController.deleteSession);

export default router;
