import { Request, Response } from "express";
import { shortLinksService } from "../services/ShortLinksService";
import { fetchPageTitle } from "../services/PageTitleService";

export class ShortLinksController {
  static async getShortLinks(req: Request, res: Response): Promise<void> {
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const size = Math.max(1, parseInt(req.query.size as string, 10) || 20);
    res.json(shortLinksService.getPaginatedLinks(page, size));
  }

  static async getShortLinksByIds(req: Request, res: Response): Promise<void> {
    const ids = ((req.query.ids as string) || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    res.json(shortLinksService.getLinksByIds(ids));
  }

  static async createShortLink(req: Request, res: Response): Promise<void> {
    res.status(201).json(shortLinksService.createLink(req.body));
  }

  static async updateShortLink(req: Request, res: Response): Promise<void> {
    const { id, ...dto } = req.body;
    const updated = shortLinksService.updateLink(id, dto);

    if (!updated) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    res.json(updated);
  }

  static async deleteShortLink(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!shortLinksService.deleteLink(id)) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    res.status(200).json({ message: "Link deleted" });
  }

  static async getLongUrlTitle(req: Request, res: Response): Promise<void> {
    const url = req.query.url as string;

    if (!url) {
      res.status(400).send("URL parameter is required");
      return;
    }

    try {
      const title = await fetchPageTitle(url);
      res.type("text/plain").send(title);
    } catch {
      res.type("text/plain").send("");
    }
  }
}
