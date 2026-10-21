import { Request, Response } from "express";
import { usersService } from "../services/UsersService";
import { requireUserUuid } from "../middleware/authentication";
import { sendProblem } from "../problem";

export class UsersController {
  static getCurrentUser(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    res.json(usersService.getUser(uuid));
  }

  static updateCurrentUserName(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    const { name } = req.body;
    if (name && typeof name === "string") {
      const updatedUser = usersService.updateUserName(uuid, name);
      res.json(updatedUser);
    } else {
      sendProblem(res, 400, "Name is required");
    }
  }

  static getSessions(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    res.json(usersService.getSessions(uuid));
  }

  static deleteCurrentSession(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    usersService.deleteCurrentSession(uuid);
    res.status(200).json({ message: "Current session terminated" });
  }

  static deleteOtherSessions(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    usersService.deleteOtherSessions(uuid);
    res.status(200).json({ message: "Other sessions terminated" });
  }

  static getPreferences(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    try {
      res.json(usersService.getPreferences(uuid));
    } catch {
      sendProblem(res, 404, "Preferences not found");
    }
  }

  static updatePreferences(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    const { urlCleanerMode } = req.body ?? {};
    try {
      const updated = usersService.updatePreferences(uuid, urlCleanerMode);
      if (!updated) {
        sendProblem(res, 400, "Invalid or missing urlCleanerMode. Expected DISABLE, SUGGEST or AUTO_CLEAN.");
        return;
      }
      res.json(updated);
    } catch {
      sendProblem(res, 404, "Preferences not found");
    }
  }

  static deleteSession(req: Request, res: Response) {
    const uuid = requireUserUuid(req);
    const { id } = req.params;
    const success = usersService.deleteSession(uuid, id);
    if (!success) {
      sendProblem(res, 404, "Session not found");
      return;
    }
    res.status(200).json({ message: "Session terminated" });
  }
}
