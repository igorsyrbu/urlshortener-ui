import {randomUUID} from "crypto";
import {tagsService} from "./TagsService";
import {memoryStore} from "./MemoryStore";

export interface ShortLink {
  id: string;
  title: string;
  key: string;
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
  key: string;
  isActive?: boolean;
  tagIds?: string[];
}

export interface UpdateShortLinkDto {
  longUrl?: string;
  title?: string;
  key?: string;
  isActive?: boolean;
  tagIds?: string[];
}

export type ShortLinkMutationResult =
  | { ok: true; link: ShortLink }
  | { ok: false; status: 400 | 404 | 409; error: string };

const CONFLICT_MESSAGE = "This short link is already taken.";

export class ShortLinksService {
  private static readonly CONSTANTS = {
    DEFAULT_TITLE: "Untitled Link",
    BASE_DOMAIN: "https://sho.rt",
  };

  private static readonly KEY_RULES = {
    MAX_LENGTH: 30,
    PATTERN: /^[A-Za-z0-9-]+$/,
  };

  private static readonly RANDOM_KEY_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private static readonly RANDOM_KEY_LENGTH = 6;

  /**
   * Enrich a link with its associated tag IDs.
   */
  private enrichLinkWithTags(uuid: string, link: ShortLink): ShortLink {
    return {
      ...link,
      tagIds: tagsService.getTagIdsForLink(uuid, link.id),
    };
  }

  private normalizeKey(key: string): string {
    return key.toLowerCase();
  }

  private validateKey(key: string): string | null {
    if (!key) return "Key is required.";
    if (key.length > ShortLinksService.KEY_RULES.MAX_LENGTH) {
      return "Key must be 30 characters or fewer.";
    }
    if (!ShortLinksService.KEY_RULES.PATTERN.test(key)) {
      return "Key can only contain letters, numbers, and hyphens.";
    }
    return null;
  }

  private isKeyTaken(uuid: string, key: string, excludeId?: string): boolean {
    const normalized = this.normalizeKey(key);
    const userState = memoryStore.getUserState(uuid);
    return userState.links.some(
      (link) => link.id !== excludeId && this.normalizeKey(link.key) === normalized,
    );
  }

  private isGloballyTaken(key: string): boolean {
    const normalized = this.normalizeKey(key);
    for (const state of memoryStore.getAllUserStates()) {
      if (state.links.some((link) => this.normalizeKey(link.key) === normalized)) {
        return true;
      }
    }
    return false;
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
  public getPaginatedLinks(uuid: string, page: number, size: number, showArchived: boolean = false, search?: string): Page<ShortLink> {
    const userState = memoryStore.getUserState(uuid);
    let links = showArchived ? userState.links : userState.links.filter((l) => l.isActive);

    if (search) {
      const q = search.toLowerCase();
      links = links.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.shortUrl.toLowerCase().includes(q) ||
          l.key.toLowerCase().includes(q) ||
          l.longUrl.toLowerCase().includes(q)
      );
    }

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
   * The `key` is required; taken keys are rejected with a 409 conflict.
   *
   * @param uuid - The user's custom UUID
   * @param dto - The configuration for the new ShortLink
   */
  public createLink(uuid: string, dto: CreateShortLinkDto): ShortLinkMutationResult {
    const key = dto.key?.trim() ?? "";

    const keyError = this.validateKey(key);
    if (keyError) return { ok: false, status: 400, error: keyError };
    if (this.isKeyTaken(uuid, key)) {
      return { ok: false, status: 409, error: CONFLICT_MESSAGE };
    }

    const newLink: ShortLink = {
      id: randomUUID(),
      title: dto.title?.trim() || ShortLinksService.CONSTANTS.DEFAULT_TITLE,
      key,
      shortUrl: `${ShortLinksService.CONSTANTS.BASE_DOMAIN}/${key}`,
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
    return { ok: true, link: this.enrichLinkWithTags(uuid, newLink) };
  }

  /**
   * Updates an existing short link in memory by its ID.
   * `key` is editable; re-casing the existing key is always accepted, while
   * switching to another taken key is rejected with a 409 conflict.
   *
   * @param uuid - The user's custom UUID
   * @param id - The ShortLink ID to update
   * @param dto - Optional new fields to overlay
   */
  public updateLink(uuid: string, id: string, dto: UpdateShortLinkDto): ShortLinkMutationResult {
    const userState = memoryStore.getUserState(uuid);
    const links = userState.links;
    const index = links.findIndex((link) => link.id === id);
    if (index === -1) {
      return { ok: false, status: 404, error: "Link not found" };
    }

    const existingLink = links[index];

    let key = existingLink.key;
    if (dto.key !== undefined) {
      key = dto.key.trim();
      const keyError = this.validateKey(key);
      if (keyError) return { ok: false, status: 400, error: keyError };

      const isReCasing = this.normalizeKey(key) === this.normalizeKey(existingLink.key);
      if (!isReCasing && this.isKeyTaken(uuid, key, id)) {
        return { ok: false, status: 409, error: CONFLICT_MESSAGE };
      }
    }

    const updatedLink: ShortLink = {
      ...existingLink,
      key,
      shortUrl: `${ShortLinksService.CONSTANTS.BASE_DOMAIN}/${key}`,
      longUrl: dto.longUrl ?? existingLink.longUrl,
      title: dto.title ?? existingLink.title,
      isActive: dto.isActive ?? existingLink.isActive,
    };

    // Handle tag associations if provided
    if (dto.tagIds !== undefined) {
      const validTagIds = tagsService.validateAndFilterTagIds(uuid, dto.tagIds);
      tagsService.associateTagsWithLink(uuid, id, validTagIds);
    }

    links[index] = updatedLink;
    return { ok: true, link: this.enrichLinkWithTags(uuid, updatedLink) };
  }

  /**
   * Returns `true` when the key is already taken by one of the user's links
   * (case-insensitive) — mirroring the create/update conflict logic.
   */
  public keyExists(uuid: string, key: string): boolean {
    return this.isKeyTaken(uuid, key);
  }

  /**
   * Generates a random short key that is not already taken by any link in the store.
   */
  public generateRandomKey(): string {
    const chars = ShortLinksService.RANDOM_KEY_CHARS;
    const length = ShortLinksService.RANDOM_KEY_LENGTH;

    let key = "";
    do {
      key = Array.from(
        { length },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");
    } while (this.isGloballyTaken(key));

    return key;
  }

  /**
   * Finds an active short link by its short key, case-insensitively.
   * Searches all user states. Returns null if not found or inactive.
   */
  public findByShortKey(key: string): ShortLink | null {
    const normalized = key.toLowerCase();
    for (const state of memoryStore.getAllUserStates()) {
      const link = state.links.find(
        (l) => l.isActive && l.key.toLowerCase() === normalized,
      );
      if (link) return link;
    }
    return null;
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
}

export const shortLinksService = new ShortLinksService();
