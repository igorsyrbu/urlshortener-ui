export interface PageDTO<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ShortLinkDTO {
  id: string;
  title: string;
  key: string;
  shortUrl: string;
  longUrl: string;
  isActive: boolean;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RandomKeyResponse {
  key: string;
}

export interface ShortLinkPreviewDTO {
    key: string;
    shortUrl: string;
    longUrl: string;
    title: string;
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

export interface ImportFailureDTO {
  shortLink: string | null;
  destinationUrl: string | null;
  reason: string;
}

export interface ImportResponseDTO {
  imported: number;
  failed: ImportFailureDTO[];
}

export type UrlCleanerMode = "DISABLE" | "SUGGEST" | "AUTO_CLEAN";

export interface UserPreferences {
  urlCleanerMode: UrlCleanerMode;
}

