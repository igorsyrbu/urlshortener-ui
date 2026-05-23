import tagsData from "../data/tags.json" with { type: "json" };
import { randomUUID } from "crypto";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TagWithCount extends Tag {
  linkCount: number;
}

export interface CreateTagDto {
  name: string;
  color: string;
}

export interface UpdateTagDto {
  id: string;
  name: string;
  color: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

const ALLOWED_COLORS = ["red", "yellow", "lime", "green", "blue", "cyan", "purple", "gray"];

export class TagsService {
  private inMemoryTags: Tag[] = this.initializeMockData();
  private linkTagAssociations: Map<string, string[]> = new Map();

  private initializeMockData(): Tag[] {
    return tagsData.tags.map((tag: any) => ({
      ...tag,
    }));
  }

  /**
   * Validates that all provided tagIds exist in the tags store.
   * Returns only the valid tagIds (filters out invalid ones silently).
   */
  public validateAndFilterTagIds(tagIds: string[]): string[] {
    const validTagIds = new Set(this.inMemoryTags.map((tag) => tag.id));
    return tagIds.filter((id) => validTagIds.has(id));
  }

  /**
   * Associates tags with a link. Replaces any existing associations.
   */
  public associateTagsWithLink(linkId: string, tagIds: string[]): void {
    if (tagIds.length === 0) {
      this.linkTagAssociations.delete(linkId);
    } else {
      // Remove duplicates and store
      this.linkTagAssociations.set(linkId, [...new Set(tagIds)]);
    }
  }

  /**
   * Gets all tag IDs associated with a link.
   */
  public getTagIdsForLink(linkId: string): string[] {
    return this.linkTagAssociations.get(linkId) || [];
  }

  /**
   * Removes all tag associations for a link (when link is deleted).
   */
  public removeLinkAssociations(linkId: string): void {
    this.linkTagAssociations.delete(linkId);
  }

  /**
   * Calculates the link count for a specific tag.
   */
  private getLinkCountForTag(tagId: string): number {
    let count = 0;
    for (const tagIds of this.linkTagAssociations.values()) {
      if (tagIds.includes(tagId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Removes a tag from all link associations (when tag is deleted).
   */
  public removeTagFromAllAssociations(tagId: string): void {
    for (const [linkId, tagIds] of this.linkTagAssociations) {
      const filtered = tagIds.filter((id) => id !== tagId);
      if (filtered.length === 0) {
        this.linkTagAssociations.delete(linkId);
      } else {
        this.linkTagAssociations.set(linkId, filtered);
      }
    }
  }

  /**
   * Retrieves a paginated list of tags.
   */
  public getTags(page: number, size: number): Page<Tag> {
    const startIndex = page * size;
    const content = this.inMemoryTags.slice(startIndex, startIndex + size);
    const totalElements = this.inMemoryTags.length;

    return {
      content,
      totalPages: Math.ceil(totalElements / size),
      totalElements,
      size,
      number: page,
      first: page === 0,
      last: startIndex + size >= totalElements,
      empty: content.length === 0,
    };
  }

  /**
   * Retrieves a paginated list of tags with link counts.
   */
  public getTagsWithCount(page: number, size: number): Page<TagWithCount> {
    const tagsPage = this.getTags(page, size);
    
    const contentWithCount: TagWithCount[] = tagsPage.content.map((tag) => ({
      ...tag,
      linkCount: this.getLinkCountForTag(tag.id),
    }));

    return {
      ...tagsPage,
      content: contentWithCount,
    };
  }

  /**
   * Creates a new tag.
   * Validates: name is required, color is allowed, name is unique.
   */
  public createTag(dto: CreateTagDto): Tag | null {
    const trimmedName = dto.name.trim();
    
    if (!trimmedName) {
      return null;
    }

    if (!ALLOWED_COLORS.includes(dto.color)) {
      return null;
    }

    // Check for duplicate name (case-insensitive)
    const nameLower = trimmedName.toLowerCase();
    const existing = this.inMemoryTags.find(
      (tag) => tag.name.toLowerCase() === nameLower
    );
    if (existing) {
      return null;
    }

    const newTag: Tag = {
      id: randomUUID(),
      name: trimmedName,
      color: dto.color,
    };

    this.inMemoryTags.unshift(newTag);
    return newTag;
  }

  /**
   * Updates an existing tag.
   * Validates: tag exists, name is unique if changed.
   */
  public updateTag(dto: UpdateTagDto): Tag | null {
    const tagIndex = this.inMemoryTags.findIndex((tag) => tag.id === dto.id);
    if (tagIndex === -1) {
      return null;
    }

    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      return null;
    }

    if (!ALLOWED_COLORS.includes(dto.color)) {
      return null;
    }

    const existingTag = this.inMemoryTags[tagIndex];
    const nameLower = trimmedName.toLowerCase();
    
    // Check for duplicate name if changed (case-insensitive)
    if (nameLower !== existingTag.name.toLowerCase()) {
      const duplicate = this.inMemoryTags.find(
        (tag) => tag.name.toLowerCase() === nameLower
      );
      if (duplicate) {
        return null;
      }
    }

    const updatedTag: Tag = {
      ...existingTag,
      name: trimmedName,
      color: dto.color,
    };

    this.inMemoryTags[tagIndex] = updatedTag;
    return updatedTag;
  }

  /**
   * Deletes a tag and removes all its associations.
   */
  public deleteTag(id: string): boolean {
    const initialLength = this.inMemoryTags.length;
    this.inMemoryTags = this.inMemoryTags.filter((tag) => tag.id !== id);
    
    const wasDeleted = this.inMemoryTags.length < initialLength;
    if (wasDeleted) {
      this.removeTagFromAllAssociations(id);
    }
    
    return wasDeleted;
  }
}

export const tagsService = new TagsService();
