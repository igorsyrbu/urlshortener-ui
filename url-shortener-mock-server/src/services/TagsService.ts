import { randomUUID } from "crypto";
import { memoryStore } from "./MemoryStore";

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
  /**
   * Validates that all provided tagIds exist in the tags store.
   * Returns only the valid tagIds (filters out invalid ones silently).
   */
  public validateAndFilterTagIds(uuid: string, tagIds: string[]): string[] {
    const userState = memoryStore.getUserState(uuid);
    const tags = userState.tags;
    const validTagIds = new Set(tags.map((tag) => tag.id));
    return tagIds.filter((id) => validTagIds.has(id));
  }

  /**
   * Associates tags with a link. Replaces any existing associations.
   */
  public associateTagsWithLink(uuid: string, linkId: string, tagIds: string[]): void {
    const userState = memoryStore.getUserState(uuid);
    const associations = userState.tagAssociations;
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
    const userState = memoryStore.getUserState(uuid);
    const associations = userState.tagAssociations;
    return associations.get(linkId) || [];
  }

  /**
   * Removes all tag associations for a link (when link is deleted).
   */
  public removeLinkAssociations(uuid: string, linkId: string): void {
    const userState = memoryStore.getUserState(uuid);
    const associations = userState.tagAssociations;
    associations.delete(linkId);
  }

  /**
   * Calculates the link count for a specific tag.
   */
  private getLinkCountForTag(uuid: string, tagId: string): number {
    const userState = memoryStore.getUserState(uuid);
    const associations = userState.tagAssociations;
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
    const userState = memoryStore.getUserState(uuid);
    const associations = userState.tagAssociations;
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
   * Retrieves a paginated list of tags, optionally filtered by search term.
   */
  public getTags(uuid: string, page: number, size: number, search?: string): Page<Tag> {
    const userState = memoryStore.getUserState(uuid);
    const tags = search
      ? userState.tags.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase()))
      : userState.tags;
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
   * Retrieves a paginated list of tags with link counts, optionally filtered by search term.
   */
  public getTagsWithCount(uuid: string, page: number, size: number, search?: string): Page<TagWithCount> {
    const tagsPage = this.getTags(uuid, page, size, search);
    
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

    const userState = memoryStore.getUserState(uuid);
    const tags = userState.tags;
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
    const userState = memoryStore.getUserState(uuid);
    const tags = userState.tags;
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
    const userState = memoryStore.getUserState(uuid);
    const initialLength = userState.tags.length;
    userState.tags = userState.tags.filter((tag) => tag.id !== id);
    
    const wasDeleted = userState.tags.length < initialLength;
    if (wasDeleted) {
      this.removeTagFromAllAssociations(uuid, id);
    }
    
    return wasDeleted;
  }
}

export const tagsService = new TagsService();

