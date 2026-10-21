import { Request, Response } from "express";
import { shortLinksService } from "../services/ShortLinksService";
import { fetchOpenGraph } from "../services/OpenGraphService";
import { cleanUrl } from "../services/UrlCleanerService";
import { requireUserUuid } from "../middleware/authentication";
import { importJobsService } from "../services/ImportJobsService";
import { sendProblem } from "../problem";

/** CSV import accepts any URL with a host, and older data may hold anything, so a stored URL can fail to parse. */
function readHostname(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export class ShortLinksController {
  static getShortLinks(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const size = Math.max(1, parseInt(req.query.size as string, 10) || 20);
    const showArchived = req.query.showArchived === "true";
    const search = req.query.search as string | undefined;
    res.json(shortLinksService.getPaginatedLinks(uuid, page, size, showArchived, search));
  }

  static getShortLinksByIds(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const ids = ((req.query.ids as string) || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    res.json(shortLinksService.getLinksByIds(uuid, ids));
  }

  static createShortLink(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const result = shortLinksService.createLink(uuid, req.body);

    if (!result.ok) {
      sendProblem(res, result.status, result.error);
      return;
    }

    res.status(201).json(result.link);
  }

  static updateShortLink(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { id, ...dto } = req.body ?? {};
    if (typeof id !== "string" || !id.trim()) {
      sendProblem(res, 400, "id must not be blank");
      return;
    }
    const result = shortLinksService.updateLink(uuid, id, dto);

    if (!result.ok) {
      sendProblem(res, result.status, result.error);
      return;
    }

    res.json(result.link);
  }

  static getRandomKey(req: Request, res: Response): void {
    res.json({ key: shortLinksService.generateRandomKey() });
  }

  static exportShortLinks(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const showArchived = req.query.showArchived === "true";
    const search = req.query.search as string | undefined;
    res.setHeader("Content-Type", "text/csv;charset=UTF-8");
    res.send(shortLinksService.exportLinksCsv(uuid, showArchived, search));
  }

  static importShortLinks(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const csvText = typeof req.body === "string" ? req.body : "";
    const generateTakenKeys = req.query.generateTakenKeys === "true";
    const fileName = typeof req.query.fileName === "string" ? req.query.fileName : undefined;
    const result = importJobsService.submit(uuid, csvText, generateTakenKeys, fileName);

    if (!result.ok) {
      sendProblem(res, result.status, result.error);
      return;
    }

    res.json(result.job);
  }

  static getImportUpdates(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const unsubscribe = importJobsService.subscribe(uuid, {
      onProgress: (progress) => { res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`); },
      onClose: () => { res.end(); },
    });
    res.on("close", unsubscribe);
  }

  static keyExists(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const key = req.params.key as string;

    if (shortLinksService.keyExists(uuid, key)) {
      res.status(200).json({ exists: true });
      return;
    }

    res.status(404).json({ exists: false });
  }

  static deleteShortLink(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { id } = req.params;

    if (!shortLinksService.deleteLink(uuid, id)) {
      sendProblem(res, 404, "Link not found");
      return;
    }

    res.status(200).json({ message: "Link deleted" });
  }

  static async getPublicLinkPreview(req: Request, res: Response): Promise<void> {
    const key = req.params.key;

    const link = shortLinksService.findByShortKey(key);
    if (!link) {
      sendProblem(res, 404, `No active short link has the key '${key}'.`);
      return;
    }

    const domain = readHostname(link.longUrl);
    const og = domain ? await fetchOpenGraph(link.longUrl) : {};

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

  static cleanUrl(req: Request, res: Response): void {
    const { url } = req.body ?? {};
    if (typeof url !== "string" || !url.trim()) {
      sendProblem(res, 400, "URL is required");
      return;
    }
    try {
      res.json(cleanUrl(url));
    } catch {
      sendProblem(res, 400, "Invalid URL");
    }
  }

  static async getLongUrlTitle(req: Request, res: Response): Promise<void> {
    const url = req.query.url as string;

    if (!url) {
      sendProblem(res, 400, "The url query parameter is required.");
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
