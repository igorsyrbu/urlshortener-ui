import linksData from "../data/shortlinks.json" with { type: "json" };
import { randomUUID } from "crypto";

export interface ShortLink {
  id: string;
  title: string;
  shortUrl: string;
  longUrl: string;
  createdAt: string;
  updatedAt: string;
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
}

export interface UpdateShortLinkDto {
  longUrl?: string;
  title?: string;
  shortUrl?: string;
}

export class ShortLinksService {
  private static readonly CONSTANTS = {
    DEFAULT_TITLE: "Untitled Link",
    BASE_DOMAIN: "https://sho.rt",
    MAX_SLUG_LENGTH: 8,
    FALLBACK_SLUG_BASE: "link",
  };

  private inMemoryLinks: ShortLink[] = this.initializeMockData();

  private initializeMockData(): ShortLink[] {
    return linksData.links.map((link: any) => ({
      ...link,
    }));
  }

  /**
   * Retrieves a paginated list of short links.
   * 
   * @param page - The zero-based page index
   * @param size - The number of items per page
   * @returns A Page object containing the content and metadata
   */
  public getPaginatedLinks(page: number, size: number): Page<ShortLink> {
    const startIndex = page * size;
    const content = this.inMemoryLinks.slice(startIndex, startIndex + size);
    const totalElements = this.inMemoryLinks.length;

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
   * Retrieves multiple short links by their exact IDs.
   * 
   * @param ids - Array of ID strings
   * @returns An array of matched ShortLinks
   */
  public getLinksByIds(ids: string[]): ShortLink[] {
    const idSet = new Set(ids);
    return this.inMemoryLinks.filter((link) => idSet.has(link.id));
  }

  /**
   * Creates a new short link from a DTO and prepends it to the in-memory array.
   * 
   * @param dto - The configuration for the new ShortLink
   * @returns The newly created ShortLink object
   */
  public createLink(dto: CreateShortLinkDto): ShortLink {
    const newLink: ShortLink = {
      id: randomUUID(),
      title: dto.title?.trim() || ShortLinksService.CONSTANTS.DEFAULT_TITLE,
      shortUrl: dto.shortUrl?.trim() || this.generateAutoShortUrl(dto.title),
      longUrl: dto.longUrl.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryLinks.unshift(newLink);
    return newLink;
  }

  /**
   * Updates an existing short link in memory by its ID.
   * 
   * @param id - The ShortLink ID to update
   * @param dto - Optional new fields to overlay
   * @returns The updated ShortLink, or null if not found
   */
  public updateLink(id: string, dto: UpdateShortLinkDto): ShortLink | null {
    const index = this.inMemoryLinks.findIndex((link) => link.id === id);
    if (index === -1) {
      return null;
    }

    const existingLink = this.inMemoryLinks[index];

    const updatedLink: ShortLink = {
      ...existingLink,
      longUrl: dto.longUrl ?? existingLink.longUrl,
      title: dto.title ?? existingLink.title,
      shortUrl: dto.shortUrl ?? existingLink.shortUrl,
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryLinks[index] = updatedLink;
    return updatedLink;
  }

  /**
   * Deletes a short link from memory by its ID.
   * 
   * @param id - The ShortLink ID to delete
   * @returns true if removed, false if not found
   */
  public deleteLink(id: string): boolean {
    const initialLength = this.inMemoryLinks.length;
    this.inMemoryLinks = this.inMemoryLinks.filter((link) => link.id !== id);
    return this.inMemoryLinks.length < initialLength;
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
