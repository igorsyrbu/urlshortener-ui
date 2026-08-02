import { Request, Response } from "express";
import { shortLinksService } from "../services/ShortLinksService";
import { fetchOpenGraph } from "../services/OpenGraphService";
import { AuthenticatedRequest } from "../middleware/authentication";

export class ShortLinksController {
  static async getShortLinks(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const size = Math.max(1, parseInt(req.query.size as string, 10) || 20);
    const showArchived = req.query.showArchived === "true";
    const search = req.query.search as string | undefined;
    res.json(shortLinksService.getPaginatedLinks(uuid, page, size, showArchived, search));
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
    const result = shortLinksService.createLink(uuid, req.body);

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(201).json(result.link);
  }

  static async updateShortLink(req: Request, res: Response): Promise<void> {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const { id, ...dto } = req.body;
    const result = shortLinksService.updateLink(uuid, id, dto);

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result.link);
  }

  static getRandomKey(req: Request, res: Response): void {
    res.json({ key: shortLinksService.generateRandomKey() });
  }

  static keyExists(req: Request, res: Response): void {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
    const key = req.params.key as string;

    if (shortLinksService.keyExists(uuid, key)) {
      res.status(200).json({ exists: true });
      return;
    }

    res.status(404).json({ exists: false });
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

  static async getPublicLinkPreview(req: Request, res: Response): Promise<void> {
    const key = req.params.key;

    const link = shortLinksService.findByShortKey(key);
    if (!link) {
      res.status(404).json({ type: "about:blank", title: "Not Found", status: 404 });
      return;
    }

    const og = await fetchOpenGraph(link.longUrl);
    const domain = new URL(link.longUrl).hostname;

    res.json({
      key,
      shortUrl: link.shortUrl,
      longUrl: link.longUrl,
      title: og.title || link.title,
      description: og.description || null,
      ogImageUrl: og.ogImageUrl || null,
      faviconDomain: domain,
    });
  }

  static async getLongUrlTitle(req: Request, res: Response): Promise<void> {
    const url = req.query.url as string;

    if (!url) {
      res.status(400).json({ title: "", description: null, ogImageUrl: null, faviconDomain: null });
      return;
    }

    try {
      const og = await fetchOpenGraph(url);
      const domain = new URL(url).hostname;
      res.json({
        title: og.title || "",
        description: og.description || null,
        ogImageUrl: og.ogImageUrl || null,
        faviconDomain: domain,
      });
    } catch {
      res.json({ title: "", description: null, ogImageUrl: null, faviconDomain: null });
    }
  }
}
