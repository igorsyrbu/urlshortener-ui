import { Request, Response } from "express";
import { usersService } from "../services/UsersService";
import { AuthenticatedRequest } from "../middleware/authentication";

export class UsersController {
  static async getCurrentUser(req: Request, res: Response) {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    res.json(usersService.getUser(uuid));
  }

  static async updateCurrentUserName(req: Request, res: Response) {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const { name } = req.body;
    if (name && typeof name === "string") {
      const updatedUser = usersService.updateUserName(uuid, name);
      res.json(updatedUser);
    } else {
      res.status(400).json({ error: "Name is required" });
    }
  }

  static async getSessions(req: Request, res: Response) {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    res.json(usersService.getSessions(uuid));
  }

  static async deleteCurrentSession(req: Request, res: Response) {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    usersService.deleteCurrentSession(uuid);
    res.status(200).json({ message: "Current session terminated" });
  }

  static async deleteOtherSessions(req: Request, res: Response) {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    usersService.deleteOtherSessions(uuid);
    res.status(200).json({ message: "Other sessions terminated" });
  }

  static async deleteSession(req: Request, res: Response) {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const { id } = req.params;
    const success = usersService.deleteSession(uuid, id);
    if (!success) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.status(200).json({ message: "Session terminated" });
  }
}
