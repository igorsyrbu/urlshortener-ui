import { Request, Response } from "express";
import { BULK_ACTIONS, BULK_MAX_IDS, shortLinksService, type BulkAction } from "../services/ShortLinksService";
import { fetchOpenGraph } from "../services/OpenGraphService";
import { cleanUrl } from "../services/UrlCleanerService";
import { requireUserUuid } from "../middleware/authentication";
import { importJobsService } from "../services/ImportJobsService";
import { sendProblem } from "../problem";
import { getAppContext } from "../app-context";
import { isUuid } from "../utils/uuid";

const CACHE_CONTROL_HEADER = "Cache-Control";
const NO_STORE = "no-store";
const LINK_NOT_FOUND_DETAIL = "Link not found";
const UNKNOWN_CLIENT_ADDRESS = "unknown";

/** The visitor's query goes after the destination's own query and before its fragment. */
function appendQueryString(longUrl: string, queryString: string): string {
  if (!queryString) return longUrl;
  const fragmentStart = longUrl.indexOf("#");
  const base = fragmentStart === -1 ? longUrl : longUrl.slice(0, fragmentStart);
  const fragment = fragmentStart === -1 ? "" : longUrl.slice(fragmentStart);
  return `${base}${base.includes("?") ? "&" : "?"}${queryString}${fragment}`;
}

function readQueryString(req: Request): string {
  const queryStart = req.originalUrl.indexOf("?");
  return queryStart === -1 ? "" : req.originalUrl.slice(queryStart + 1);
}

/** CSV import accepts any URL with a host, and older data may hold anything, so a stored URL can fail to parse. */
function readHostname(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/** The ids of a bulk request, or `null` when the body is not a list of 1 to `BULK_MAX_IDS` UUIDs. */
function readBulkIds(body: unknown): string[] | null {
  const ids: unknown = typeof body === "object" && body !== null ? (body as { ids?: unknown }).ids : undefined;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > BULK_MAX_IDS) return null;
  return ids.every((id): id is string => typeof id === "string" && isUuid(id)) ? ids : null;
}

function isBulkAction(value: string): value is BulkAction {
  return (BULK_ACTIONS as readonly string[]).includes(value);
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

  static getShortLinkById(req: Request, res: Response): void {
    const link = shortLinksService.getLinkById(requireUserUuid(req), req.params.id);
    if (!link) {
      sendProblem(res, 404, LINK_NOT_FOUND_DETAIL);
      return;
    }
    res.set(CACHE_CONTROL_HEADER, NO_STORE).json(link);
  }

  static unlockPublicLink(req: Request, res: Response): void {
    const link = shortLinksService.findByShortKey(req.params.key);
    if (!link || !link.password) {
      sendProblem(res, 404, `No protected short link has the key '${req.params.key}'.`);
      return;
    }
    const password: unknown = req.body?.password;
    if (typeof password !== "string" || !password.trim()) {
      sendProblem(res, 400, "password must not be blank");
      return;
    }
    const limiter = getAppContext(req).unlockAttemptLimiter;
    const clientAddress = req.ip ?? UNKNOWN_CLIENT_ADDRESS;
    if (limiter.isLocked(link.id, clientAddress)) {
      sendProblem(res, 429, "Too many failed attempts. Try again later.");
      return;
    }
    if (password !== link.password) {
      limiter.recordFailure(link.id, clientAddress);
      sendProblem(res, 401, "Incorrect password.");
      return;
    }
    res.set(CACHE_CONTROL_HEADER, NO_STORE).json({ longUrl: appendQueryString(link.longUrl, readQueryString(req)) });
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

  static applyBulkAction(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { action } = req.params;
    if (!isBulkAction(action)) {
      sendProblem(res, 404, `No mock route for POST ${req.path}`);
      return;
    }

    const ids = readBulkIds(req.body);
    if (!ids) {
      sendProblem(res, 400, `ids must hold 1 to ${BULK_MAX_IDS} link ids`);
      return;
    }

    res.json(shortLinksService.applyBulkAction(uuid, action, ids));
  }

  static deleteShortLink(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { id } = req.params;

    if (!shortLinksService.deleteLink(uuid, id)) {
      sendProblem(res, 404, LINK_NOT_FOUND_DETAIL);
      return;
    }

    res.status(200).json({ message: "Link deleted" });
  }

  static async getPublicLinkPreview(req: Request, res: Response): Promise<void> {
    const key = req.params.key;

    const link = shortLinksService.findByShortKey(key);
    if (!link) {
      sendProblem(res, 404, `No short link has the key '${key}'.`);
      return;
    }

    if (link.password) {
      res.json({ key, shortUrl: link.shortUrl, isPasswordProtected: true });
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
      isPasswordProtected: false,
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
