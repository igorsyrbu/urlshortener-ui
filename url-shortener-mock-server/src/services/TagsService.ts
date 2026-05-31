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
  private userTagsMap: Map<string, Tag[]> = new Map();
  private userAssociationsMap: Map<string, Map<string, string[]>> = new Map();

  private getTagsForUser(uuid: string): Tag[] {
    if (!this.userTagsMap.has(uuid)) {
      this.userTagsMap.set(uuid, this.initializeMockData());
    }
    return this.userTagsMap.get(uuid)!;
  }

  private getAssociationsForUser(uuid: string): Map<string, string[]> {
    if (!this.userAssociationsMap.has(uuid)) {
      this.userAssociationsMap.set(uuid, new Map());
    }
    return this.userAssociationsMap.get(uuid)!;
  }

  private initializeMockData(): Tag[] {
    return tagsData.tags.map((tag: any) => ({
      ...tag,
    }));
  }

  /**
   * Validates that all provided tagIds exist in the tags store.
   * Returns only the valid tagIds (filters out invalid ones silently).
   */
  public validateAndFilterTagIds(uuid: string, tagIds: string[]): string[] {
    const tags = this.getTagsForUser(uuid);
    const validTagIds = new Set(tags.map((tag) => tag.id));
    return tagIds.filter((id) => validTagIds.has(id));
  }

  /**
   * Associates tags with a link. Replaces any existing associations.
   */
  public associateTagsWithLink(uuid: string, linkId: string, tagIds: string[]): void {
    const associations = this.getAssociationsForUser(uuid);
    if (tagIds.length === 0) {
      associations.delete(linkId);
    } else {
      // Remove duplicates and store
      associations.set(linkId, [...new Set(tagIds)]);
    }
  }

  /**
   * Gets all tag IDs associated with a link.
   */
  public getTagIdsForLink(uuid: string, linkId: string): string[] {
    const associations = this.getAssociationsForUser(uuid);
    return associations.get(linkId) || [];
  }

  /**
   * Removes all tag associations for a link (when link is deleted).
   */
  public removeLinkAssociations(uuid: string, linkId: string): void {
    const associations = this.getAssociationsForUser(uuid);
    associations.delete(linkId);
  }

  /**
   * Calculates the link count for a specific tag.
   */
  private getLinkCountForTag(uuid: string, tagId: string): number {
    const associations = this.getAssociationsForUser(uuid);
    let count = 0;
    for (const tagIds of associations.values()) {
      if (tagIds.includes(tagId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Removes a tag from all link associations (when tag is deleted).
   */
  public removeTagFromAllAssociations(uuid: string, tagId: string): void {
    const associations = this.getAssociationsForUser(uuid);
    for (const [linkId, tagIds] of associations) {
      const filtered = tagIds.filter((id) => id !== tagId);
      if (filtered.length === 0) {
        associations.delete(linkId);
      } else {
        associations.set(linkId, filtered);
      }
    }
  }

  /**
   * Removes all data for a given user from the in-memory store.
   */
  public clearUserData(uuid: string): void {
    this.userTagsMap.delete(uuid);
    this.userAssociationsMap.delete(uuid);
  }

  /**
   * Retrieves a paginated list of tags.
   */
  public getTags(uuid: string, page: number, size: number): Page<Tag> {
    const tags = this.getTagsForUser(uuid);
    const startIndex = page * size;
    const content = tags.slice(startIndex, startIndex + size);
    const totalElements = tags.length;

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
  public getTagsWithCount(uuid: string, page: number, size: number): Page<TagWithCount> {
    const tagsPage = this.getTags(uuid, page, size);
    
    const contentWithCount: TagWithCount[] = tagsPage.content.map((tag) => ({
      ...tag,
      linkCount: this.getLinkCountForTag(uuid, tag.id),
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
  public createTag(uuid: string, dto: CreateTagDto): Tag | null {
    const trimmedName = dto.name.trim();
    
    if (!trimmedName) {
      return null;
    }

    if (!ALLOWED_COLORS.includes(dto.color)) {
      return null;
    }

    const tags = this.getTagsForUser(uuid);
    // Check for duplicate name (case-insensitive)
    const nameLower = trimmedName.toLowerCase();
    const existing = tags.find(
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

    tags.unshift(newTag);
    return newTag;
  }

  /**
   * Updates an existing tag.
   * Validates: tag exists, name is unique if changed.
   */
  public updateTag(uuid: string, dto: UpdateTagDto): Tag | null {
    const tags = this.getTagsForUser(uuid);
    const tagIndex = tags.findIndex((tag) => tag.id === dto.id);
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

    const existingTag = tags[tagIndex];
    const nameLower = trimmedName.toLowerCase();
    
    // Check for duplicate name if changed (case-insensitive)
    if (nameLower !== existingTag.name.toLowerCase()) {
      const duplicate = tags.find(
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

    tags[tagIndex] = updatedTag;
    return updatedTag;
  }

  /**
   * Deletes a tag and removes all its associations.
   */
  public deleteTag(uuid: string, id: string): boolean {
    const tags = this.getTagsForUser(uuid);
    const initialLength = tags.length;
    const filteredTags = tags.filter((tag) => tag.id !== id);
    
    const wasDeleted = filteredTags.length < initialLength;
    if (wasDeleted) {
      this.userTagsMap.set(uuid, filteredTags);
      this.removeTagFromAllAssociations(uuid, id);
    }
    
    return wasDeleted;
  }
}

export const tagsService = new TagsService();
