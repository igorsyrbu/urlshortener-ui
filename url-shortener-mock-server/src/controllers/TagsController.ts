import { Request, Response } from "express";
import { tagsService } from "../services/TagsService";

export class TagsController {
  static async getTags(req: Request, res: Response): Promise<void> {
    const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
    const size = Math.max(1, parseInt(req.query.size as string, 10) || 20);
    const withLinksCount = req.query.withLinksCount === "true";

    if (withLinksCount) {
      res.json(tagsService.getTagsWithCount(page, size));
    } else {
      res.json(tagsService.getTags(page, size));
    }
  }

  static async createTag(req: Request, res: Response): Promise<void> {
    const { name, color } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Tag name is required" });
      return;
    }

    if (!color || typeof color !== "string") {
      res.status(400).json({ error: "Tag color is required" });
      return;
    }

    const created = tagsService.createTag({ name, color });

    if (!created) {
      res.status(400).json({ error: "Invalid tag data or duplicate name" });
      return;
    }

    res.status(201).json(created);
  }

  static async updateTag(req: Request, res: Response): Promise<void> {
    const { id, name, color } = req.body;

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Tag ID is required" });
      return;
    }

    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Tag name is required" });
      return;
    }

    if (!color || typeof color !== "string") {
      res.status(400).json({ error: "Tag color is required" });
      return;
    }

    const updated = tagsService.updateTag({ id, name, color });

    if (!updated) {
      res.status(404).json({ error: "Tag not found or duplicate name" });
      return;
    }

    res.json(updated);
  }

  static async deleteTag(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!tagsService.deleteTag(id)) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }

    res.status(204).send();
  }
}
