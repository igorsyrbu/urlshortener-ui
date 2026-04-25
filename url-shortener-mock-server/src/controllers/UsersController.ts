import { Request, Response } from "express";
import { usersService } from "../services/UsersService";

export class UsersController {
  static async getCurrentUser(req: Request, res: Response) {
    res.json(usersService.getUser());
  }

  static async updateCurrentUserName(req: Request, res: Response) {
    const { name } = req.body;
    if (name && typeof name === "string") {
      const updatedUser = usersService.updateUserName(name);
      res.json(updatedUser);
    } else {
      res.status(400).json({ error: "Name is required" });
    }
  }

  static async getSessions(req: Request, res: Response) {
    res.json(usersService.getSessions());
  }

  static async deleteCurrentSession(req: Request, res: Response) {
    usersService.deleteCurrentSession();
    res.status(200).json({ message: "Current session terminated" });
  }

  static async deleteOtherSessions(req: Request, res: Response) {
    usersService.deleteOtherSessions();
    res.status(200).json({ message: "Other sessions terminated" });
  }

  static async deleteSession(req: Request, res: Response) {
    const { id } = req.params;
    const success = usersService.deleteSession(id);
    if (!success) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.status(200).json({ message: "Session terminated" });
  }
}
