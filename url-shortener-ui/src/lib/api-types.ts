export interface PageMetadataDTO {
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface PageDTO<T> extends Partial<PageMetadataDTO> {
  content: T[];
  page?: PageMetadataDTO;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface ShortLinkDTO {
  id: string;
  title: string;
  key: string;
  shortUrl: string;
  longUrl: string;
  isActive: boolean;
  isPasswordProtected: boolean;
  /** Only in the answer of `GET /shortlinks/{id}`, and only for a protected link. */
  password?: string | null;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RandomKeyResponse {
  key: string;
}

/** A protected link's preview holds only `key`, `shortUrl` and `isPasswordProtected`. */
export interface ShortLinkPreviewDTO {
    key: string;
    shortUrl: string;
    isPasswordProtected: boolean;
    longUrl?: string;
    title?: string;
    description?: string;
    ogImageUrl?: string;
    faviconDomain?: string;
}

export interface LongUrlTitleResponse {
  title: string;
  description: string | null;
  ogImageUrl: string | null;
  faviconDomain: string | null;
}

export interface UrlCleanerResponse {
  url: string;
  removedParams: string[];
  completeProviderSkipped: boolean;
}

export type LinkImportJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED";

export interface LinkImportProgressDTO {
  processedRows: number;
  totalRows: number;
}

export interface LinkImportJobDTO extends LinkImportProgressDTO {
  id: string;
  fileName: string | null;
  generateTakenKeys: boolean;
  succeededRows: number;
  failedRows: number;
  status: LinkImportJobStatus;
  createdTimestamp: string;
  startedTimestamp: string | null;
  completedTimestamp: string | null;
  expiresTimestamp: string | null;
}

export type UrlCleanerMode = "DISABLE" | "SUGGEST" | "AUTO_CLEAN";

export interface UserPreferences {
  urlCleanerMode: UrlCleanerMode;
}
