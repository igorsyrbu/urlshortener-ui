import {randomUUID} from "crypto";
import {tagsService} from "./TagsService";
import {memoryStore} from "./MemoryStore";

export interface ShortLink {
  id: string;
  title: string;
  shortUrl: string;
  longUrl: string;
  isActive: boolean;
  tagIds?: string[];
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

export interface CreateShortLinkDto {
  longUrl: string;
  title?: string;
  shortUrl?: string;
  isActive?: boolean;
  tagIds?: string[];
}

export interface UpdateShortLinkDto {
  longUrl?: string;
  title?: string;
  shortUrl?: string;
  isActive?: boolean;
  tagIds?: string[];
}

export class ShortLinksService {
  private static readonly CONSTANTS = {
    DEFAULT_TITLE: "Untitled Link",
    BASE_DOMAIN: "https://sho.rt",
    MAX_SLUG_LENGTH: 8,
    FALLBACK_SLUG_BASE: "link",
  };

  /**
   * Enrich a link with its associated tag IDs.
   */
  private enrichLinkWithTags(uuid: string, link: ShortLink): ShortLink {
    return {
      ...link,
      tagIds: tagsService.getTagIdsForLink(uuid, link.id),
    };
  }

  /**
   * Retrieves all active short links for a user.
   */
  public getAllLinks(uuid: string): ShortLink[] {
    const userState = memoryStore.getUserState(uuid);
    return userState.links.map((link) => this.enrichLinkWithTags(uuid, link));
  }

  /**
   * Retrieves a paginated list of short links.
   *
   * @param uuid - The user's custom UUID
   * @param page - The zero-based page index
   * @param size - The number of items per page
   * @returns A Page object containing the content and metadata
   */
  public getPaginatedLinks(uuid: string, page: number, size: number, showArchived: boolean = false): Page<ShortLink> {
    const userState = memoryStore.getUserState(uuid);
    const links = showArchived ? userState.links : userState.links.filter((l) => l.isActive);
    const startIndex = page * size;
    const content = links.slice(startIndex, startIndex + size);
    const totalElements = links.length;

    return {
      content: content.map((link) => this.enrichLinkWithTags(uuid, link)),
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
   * Retrieves multiple short links by their exact IDs.
   *
   * @param uuid - The user's custom UUID
   * @param ids - Array of ID strings
   * @returns An array of matched ShortLinks
   */
  public getLinksByIds(uuid: string, ids: string[]): ShortLink[] {
    const idSet = new Set(ids);
    const userState = memoryStore.getUserState(uuid);
    return userState.links
      .filter((link) => idSet.has(link.id))
      .map((link) => this.enrichLinkWithTags(uuid, link));
  }

  /**
   * Creates a new short link from a DTO and prepends it to the in-memory array.
   *
   * @param uuid - The user's custom UUID
   * @param dto - The configuration for the new ShortLink
   * @returns The newly created ShortLink object
   */
  public createLink(uuid: string, dto: CreateShortLinkDto): ShortLink {
    const newLink: ShortLink = {
      id: randomUUID(),
      title: dto.title?.trim() || ShortLinksService.CONSTANTS.DEFAULT_TITLE,
      shortUrl: dto.shortUrl?.trim() || this.generateAutoShortUrl(dto.title),
      longUrl: dto.longUrl.trim(),
      isActive: dto.isActive ?? true,
    };

    // Handle tag associations if provided
    if (dto.tagIds && dto.tagIds.length > 0) {
      const validTagIds = tagsService.validateAndFilterTagIds(uuid, dto.tagIds);
      if (validTagIds.length > 0) {
        tagsService.associateTagsWithLink(uuid, newLink.id, validTagIds);
      }
    }

    const userState = memoryStore.getUserState(uuid);
    userState.links.unshift(newLink);
    return this.enrichLinkWithTags(uuid, newLink);
  }

  /**
   * Updates an existing short link in memory by its ID.
   *
   * @param uuid - The user's custom UUID
   * @param id - The ShortLink ID to update
   * @param dto - Optional new fields to overlay
   * @returns The updated ShortLink, or null if not found
   */
  public updateLink(uuid: string, id: string, dto: UpdateShortLinkDto): ShortLink | null {
    const userState = memoryStore.getUserState(uuid);
    const links = userState.links;
    const index = links.findIndex((link) => link.id === id);
    if (index === -1) {
      return null;
    }

    const existingLink = links[index];

    const updatedLink: ShortLink = {
      ...existingLink,
      longUrl: dto.longUrl ?? existingLink.longUrl,
      title: dto.title ?? existingLink.title,
      shortUrl: dto.shortUrl ?? existingLink.shortUrl,
      isActive: dto.isActive ?? existingLink.isActive,
    };

    // Handle tag associations if provided
    if (dto.tagIds !== undefined) {
      const validTagIds = tagsService.validateAndFilterTagIds(uuid, dto.tagIds);
      tagsService.associateTagsWithLink(uuid, id, validTagIds);
    }

    links[index] = updatedLink;
    return this.enrichLinkWithTags(uuid, updatedLink);
  }

  /**
   * Deletes a short link from memory by its ID.
   * Also removes all tag associations for this link.
   *
   * @param uuid - The user's custom UUID
   * @param id - The ShortLink ID to delete
   * @returns true if removed, false if not found
   */
  public deleteLink(uuid: string, id: string): boolean {
    const userState = memoryStore.getUserState(uuid);
    const initialLength = userState.links.length;
    userState.links = userState.links.filter((link) => link.id !== id);

    const wasDeleted = userState.links.length < initialLength;
    if (wasDeleted) {
      // Clean up tag associations
      tagsService.removeLinkAssociations(uuid, id);
    }

    return wasDeleted;
  }

  /**
   * Automatically generates a fallback short URL containing normalized title words and entropy.
   */
  private generateAutoShortUrl(title?: string): string {
    const baseSlug = (title || ShortLinksService.CONSTANTS.FALLBACK_SLUG_BASE)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, ShortLinksService.CONSTANTS.MAX_SLUG_LENGTH);

    const entropy = Math.floor(Math.random() * 100);
    return `${ShortLinksService.CONSTANTS.BASE_DOMAIN}/${baseSlug}${entropy}`;
  }
}

export const shortLinksService = new ShortLinksService();

