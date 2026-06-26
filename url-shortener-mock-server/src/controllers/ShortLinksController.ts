import { Request, Response } from "express";
import { shortLinksService } from "../services/ShortLinksService";
import { fetchPageTitle } from "../services/PageTitleService";
import { AuthenticatedRequest } from "../middleware/authentication";

export class ShortLinksController {
  static async getShortLinks(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const size = Math.max(1, parseInt(req.query.size as string, 10) || 20);
    const showArchived = req.query.showArchived === "true";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
    const tagIds = ShortLinksController.parseTagIdsQuery(req.query.tagIds);

    res.json(shortLinksService.getPaginatedLinks(uuid, page, size, { showArchived, q, tagIds }));
  }

  private static parseTagIdsQuery(value: unknown): string[] | undefined {
    const rawTagIds = Array.isArray(value) ? value : [value];
    const tagIds = rawTagIds
      .filter((tagId): tagId is string => typeof tagId === "string")
      .flatMap((tagId) => tagId.split(","))
      .map((tagId) => tagId.trim())
      .filter(Boolean);

    return tagIds.length > 0 ? tagIds : undefined;
  }

  static async getShortLinksByIds(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const ids = ((req.query.ids as string) || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    res.json(shortLinksService.getLinksByIds(uuid, ids));
  }

  static async createShortLink(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    res.status(201).json(shortLinksService.createLink(uuid, req.body));
  }

  static async updateShortLink(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const { id, ...dto } = req.body;
    const updated = shortLinksService.updateLink(uuid, id, dto);

    if (!updated) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    res.json(updated);
  }

  static async deleteShortLink(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const { id } = req.params;

    if (!shortLinksService.deleteLink(uuid, id)) {
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
