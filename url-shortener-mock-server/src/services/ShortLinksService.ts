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
  longUrl: string;
  title?: string;
  key: string;
  isActive?: boolean;
  tagIds?: string[];
}

export type ShortLinkMutationResult =
  | { ok: true; link: ShortLink }
  | { ok: false; status: 400 | 404 | 409; error: string };

export interface CsvImportFailure {
  shortLink: string | null;
  destinationUrl: string | null;
  reason: string;
}

export type ImportLinksResult =
  | { ok: true; imported: number; failed: CsvImportFailure[] }
  | { ok: false; error: string };

export interface CsvColumnIndexes {
  shortLink: number;
  destinationUrl: number;
  title: number;
  tags: number;
}

const CONFLICT_MESSAGE = "This short link is already taken.";

export class ShortLinksService {
  private static readonly CONSTANTS = {
    DEFAULT_TITLE: "Untitled Link",
    BASE_DOMAIN: "https://sho.rt",
  };

  private static readonly KEY_RULES = {
    MIN_LENGTH: 2,
    MAX_LENGTH: 30,
    PATTERN: /^[A-Za-z0-9-_]+$/,
  };

  private static readonly RANDOM_KEY_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private static readonly RANDOM_KEY_LENGTH = 6;

  private static readonly EXPORT_HEADERS = [
    "Short link",
    "Destination URL",
    "Title",
    "Clicks",
    "Created at",
    "Updated at",
    "Tags",
    "Archive",
  ];

  private static readonly IMPORT_RULES = {
    MAX_ROWS: 1000,
    KEY_PATTERN: /^[A-Za-z0-9-_]+$/,
    KEY_MAX_LENGTH: 30,
    TITLE_MAX_LENGTH: 255,
    TAG_NAME_MAX_LENGTH: 50,
    URL_MAX_LENGTH: 2000,
    RESERVED_KEYS: [
      "shortlinks",
      "dashboard",
      "tags",
      "analytics",
      "login",
      "settings",
      "api",
      "public",
    ],
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

  private normalizeKey(key: string): string {
    return key.toLowerCase();
  }

  /**
   * Reserved keys are indistinguishable from taken ones by design:
   * the user must never learn that reservation exists.
   */
  private isReservedKey(key: string): boolean {
    return ShortLinksService.IMPORT_RULES.RESERVED_KEYS.includes(key.toLowerCase());
  }

  private validateKey(key: string): string | null {
    if (!key) return "key must not be blank";
    if (key.length < ShortLinksService.KEY_RULES.MIN_LENGTH) {
      return "Key must be between 2 and 30 characters.";
    }
    if (key.length > ShortLinksService.KEY_RULES.MAX_LENGTH) {
      return "Key must be 30 characters or fewer.";
    }
    if (!ShortLinksService.KEY_RULES.PATTERN.test(key)) {
      return "Key can only contain letters, numbers, underscores, and hyphens.";
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
    if (this.isReservedKey(key)) {
      return { ok: false, status: 409, error: `Key '${key}' is already taken.` };
    }
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
   * Mirrors the real backend: PUT is a full update — `key` and `longUrl`
   * are required on every call. Partial payloads (e.g. `{id, isActive}`)
   * are rejected with a 400, just like production.
   * `key` is editable; re-casing the existing key is always accepted, while
   * switching to another taken key is rejected with a 409 conflict.
   *
   * @param uuid - The user's custom UUID
   * @param id - The ShortLink ID to update
   * @param dto - Full new field set (key + longUrl required)
   */
  public updateLink(uuid: string, id: string, dto: UpdateShortLinkDto): ShortLinkMutationResult {
    const key = typeof dto.key === "string" ? dto.key.trim() : "";
    if (!key) {
      return { ok: false, status: 400, error: "key must not be blank" };
    }
    const keyError = this.validateKey(key);
    if (keyError) return { ok: false, status: 400, error: keyError };
    if (this.isReservedKey(key)) {
      return { ok: false, status: 409, error: `Key '${key}' is already taken.` };
    }

    const longUrl = typeof dto.longUrl === "string" ? dto.longUrl.trim() : "";
    if (!longUrl) {
      return { ok: false, status: 400, error: "longUrl must not be blank" };
    }
    if (!isSafeHttpUrl(longUrl)) {
      return { ok: false, status: 400, error: "longUrl must be a valid URL" };
    }

    const userState = memoryStore.getUserState(uuid);
    const links = userState.links;
    const index = links.findIndex((link) => link.id === id);
    if (index === -1) {
      return { ok: false, status: 404, error: "Link not found" };
    }

    const existingLink = links[index];

    const isReCasing = this.normalizeKey(key) === this.normalizeKey(existingLink.key);
    if (!isReCasing && this.isKeyTaken(uuid, key, id)) {
      return { ok: false, status: 409, error: CONFLICT_MESSAGE };
    }

    const updatedLink: ShortLink = {
      ...existingLink,
      key,
      shortUrl: `${ShortLinksService.CONSTANTS.BASE_DOMAIN}/${key}`,
      longUrl,
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

  /**
   * Builds a CSV export of the user's links, honoring the same
   * showArchived/search filters as the paginated list endpoint.
   * Cells starting with formula characters are prefixed against
   * spreadsheet formula injection, mirroring the real backend.
   */
  public exportLinksCsv(uuid: string, showArchived: boolean = false, search?: string): string {
    const links = this.getPaginatedLinks(
      uuid,
      0,
      Number.MAX_SAFE_INTEGER,
      showArchived,
      search,
    ).content;
    const userState = memoryStore.getUserState(uuid);
    const tagNames = new Map(userState.tags.map((tag) => [tag.id, tag.name]));
    const timestamp = new Date().toISOString();

    const rows = links.map((link) => [
      link.shortUrl,
      link.longUrl,
      link.title,
      "0",
      timestamp,
      timestamp,
      (link.tagIds ?? [])
        .map((id) => tagNames.get(id) ?? "")
        .filter(Boolean)
        .join(","),
      String(!link.isActive),
    ]);

    return [ShortLinksService.EXPORT_HEADERS, ...rows]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");
  }

  /**
   * Imports links from raw CSV text. Unknown/extra columns are ignored;
   * every row creates a new active link. Returns per-row failures instead
   * of throwing, except for fail-fast validation of the whole file.
   * When generateTakenKeys is set, rows whose key is taken (or reserved,
   * which is never exposed to the user) get a fresh random key instead
   * of landing in `failed`.
   */
  public importLinksCsv(uuid: string, csvText: string, generateTakenKeys: boolean = false): ImportLinksResult {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
      return { ok: false, error: "Empty file: a header row is required." };
    }

    const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
    const columns = {
      shortLink: header.indexOf("short link"),
      destinationUrl: header.indexOf("destination url"),
      title: header.indexOf("title"),
      tags: header.indexOf("tags"),
    };
    if (columns.destinationUrl === -1) {
      return { ok: false, error: "'Destination URL' column is required." };
    }

    const dataLines = lines.slice(1);
    if (dataLines.length === 0) {
      return { ok: false, error: "No data rows found." };
    }
    if (dataLines.length > ShortLinksService.IMPORT_RULES.MAX_ROWS) {
      return {
        ok: false,
        error: `Too many rows: maximum ${ShortLinksService.IMPORT_RULES.MAX_ROWS} data rows per import.`,
      };
    }
    const hasDestination = dataLines.some(
      (line) => (parseCsvLine(line)[columns.destinationUrl] ?? "").trim().length > 0,
    );
    if (!hasDestination) {
      return { ok: false, error: "'Destination URL' is required: at least one row must have a value." };
    }

    const failed: CsvImportFailure[] = [];
    let imported = 0;
    for (const line of dataLines) {
      const fields = parseCsvLine(line);
      if (isBlankRow(fields, columns)) {
        continue;
      }
      const failure = this.importCsvRow(uuid, fields, columns, generateTakenKeys);
      if (failure === null) {
        imported++;
      } else {
        failed.push(failure);
      }
    }
    return { ok: true, imported, failed };
  }

  /**
   * Imports a single CSV row. Returns null on success,
   * or the failure entry for the per-row results.
   * Taken and reserved keys are indistinguishable to the user:
   * both are regenerated when generateTakenKeys is set, and both
   * report as "Key is already taken." otherwise (no key name).
   */
  private importCsvRow(
    uuid: string,
    fields: string[],
    columns: CsvColumnIndexes,
    generateTakenKeys: boolean,
  ): CsvImportFailure | null {
    const rules = ShortLinksService.IMPORT_RULES;
    const rawShort = columns.shortLink === -1 ? "" : (fields[columns.shortLink] ?? "").trim();
    const rawDestination = (fields[columns.destinationUrl] ?? "").trim();
    const rawTitle = columns.title === -1 ? "" : (fields[columns.title] ?? "").trim();
    const rawTags = columns.tags === -1 ? "" : (fields[columns.tags] ?? "").trim();
    const echo = { shortLink: rawShort || null, destinationUrl: rawDestination || null };
    const fail = (reason: string): CsvImportFailure => ({ ...echo, reason });

    if (!rawDestination) {
      return fail("'Destination URL' is required.");
    }
    if (rawDestination.length > rules.URL_MAX_LENGTH) {
      return fail(`Destination URL exceeds the maximum length of ${rules.URL_MAX_LENGTH} characters.`);
    }
    if (!hasUrlHost(rawDestination)) {
      return fail("Destination URL is invalid.");
    }

    let key = rawShort ? (rawShort.split("/").pop() ?? "").trim() : "";
    if (!key) {
      key = this.generateRandomKey();
    }
    if (key.length > rules.KEY_MAX_LENGTH) {
      return fail(`Key exceeds the maximum length of ${rules.KEY_MAX_LENGTH} characters.`);
    }
    if (!rules.KEY_PATTERN.test(key)) {
      return fail(`Key '${key}' can only contain letters, numbers, underscores, and hyphens.`);
    }
    if (this.isReservedKey(key) || this.isGloballyTaken(key)) {
      if (generateTakenKeys) {
        key = this.generateRandomKey();
      } else {
        return fail("Key is already taken.");
      }
    }
    if (rawTitle.length > rules.TITLE_MAX_LENGTH) {
      return fail("Title exceeds the maximum length of 255 characters.");
    }

    const tagNames = parseTagNames(rawTags);
    for (const name of tagNames) {
      if (name.length > rules.TAG_NAME_MAX_LENGTH) {
        return fail(`Tag name exceeds the maximum length of ${rules.TAG_NAME_MAX_LENGTH} characters.`);
      }
    }
    const tagIds = tagNames.map((name) => tagsService.findOrCreateTagByName(uuid, name).id);

    const newLink: ShortLink = {
      id: randomUUID(),
      title: rawTitle || ShortLinksService.CONSTANTS.DEFAULT_TITLE,
      key,
      shortUrl: `${ShortLinksService.CONSTANTS.BASE_DOMAIN}/${key}`,
      longUrl: rawDestination,
      isActive: true,
    };
    memoryStore.getUserState(uuid).links.unshift(newLink);
    tagsService.associateTagsWithLink(uuid, newLink.id, tagIds);
    return null;
  }
}

export const shortLinksService = new ShortLinksService();

/**
 * Splits one CSV line into fields, honoring double-quoted sections
 * (embedded commas, escaped double quotes). Surrounding spaces trimmed.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((field) => field.trim());
}

/**
 * Quotes a CSV cell, doubling embedded quotes. Cells starting with
 * formula characters are prefixed against spreadsheet formula injection.
 */
function escapeCsvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Splits a Tags cell on commas, trims, drops empties,
 * and dedupes case-insensitively keeping the first casing.
 */
function parseTagNames(rawTags: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const name of rawTags.split(",").map((tag) => tag.trim()).filter(Boolean)) {
    const lower = name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      names.push(name);
    }
  }
  return names;
}

/**
 * Mirrors the backend's `new URI(url).getHost() != null` syntax check:
 * any scheme with a host passes; parse failures and hostless values don't.
 */
function hasUrlHost(value: string): boolean {
  try {
    return new URL(value).host.length > 0;
  } catch {
    return false;
  }
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A row is blank when all four known columns are blank
 * (missing columns count as blank). Blank rows are skipped silently.
 */
function isBlankRow(fields: string[], columns: CsvColumnIndexes): boolean {
  const indexes = [columns.shortLink, columns.destinationUrl, columns.title, columns.tags];
  return indexes.every((index) => index === -1 || !(fields[index] ?? "").trim());
}
