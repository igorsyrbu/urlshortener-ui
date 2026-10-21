import { Request, Response } from "express";
import { tagsService } from "../services/TagsService";
import { requireUserUuid } from "../middleware/authentication";
import { sendProblem } from "../problem";

export class TagsController {
  static getTags(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const size = Math.max(1, parseInt(req.query.size as string, 10) || 20);
    const withLinksCount = req.query.withLinksCount === "true";
    const search = req.query.search as string | undefined;

    if (withLinksCount) {
      res.json(tagsService.getTagsWithCount(uuid, page, size, search));
    } else {
      res.json(tagsService.getTags(uuid, page, size, search));
    }
  }

  static createTag(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { name, color } = req.body;

    if (!name || typeof name !== "string") {
      sendProblem(res, 400, "Tag name is required");
      return;
    }

    if (!color || typeof color !== "string") {
      sendProblem(res, 400, "Tag color is required");
      return;
    }

    const created = tagsService.createTag(uuid, { name, color });

    if (!created) {
      sendProblem(res, 400, "Invalid tag data or duplicate name");
      return;
    }

    res.status(201).json(created);
  }

  static updateTag(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { id, name, color } = req.body;

    if (!id || typeof id !== "string") {
      sendProblem(res, 400, "Tag ID is required");
      return;
    }

    if (!name || typeof name !== "string") {
      sendProblem(res, 400, "Tag name is required");
      return;
    }

    if (!color || typeof color !== "string") {
      sendProblem(res, 400, "Tag color is required");
      return;
    }

    const updated = tagsService.updateTag(uuid, { id, name, color });

    if (!updated) {
      sendProblem(res, 404, "Tag not found or duplicate name");
      return;
    }

    res.json(updated);
  }

  static deleteTag(req: Request, res: Response): void {
    const uuid = requireUserUuid(req);
    const { id } = req.params;

    if (!tagsService.deleteTag(uuid, id)) {
      sendProblem(res, 404, "Tag not found");
      return;
    }

    res.status(204).send();
  }
}
