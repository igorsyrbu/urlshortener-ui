import { BadgeVariant } from "@/components/ui/badge";

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
  shortUrl: string;
  longUrl: string;
  isActive: boolean;
  tagIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShortLinkRequest {
  longUrl: string;
  title: string;
  shortUrl?: string | null;
  tagIds?: string[];
}

export interface UpdateShortLinkRequest {
  id: string;
  title: string;
  longUrl: string;
  tagIds?: string[];
}


export interface TagDTO {
  id: string;
  name: string;
  color: BadgeVariant;
  linkCount?: number;
}

export interface CreateTagRequest {
  name: string;
  color: BadgeVariant;
}

export interface UpdateTagRequest {
  id: string;
  name: string;
  color: BadgeVariant;
}

export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  createdAt?: string;
}

export interface UpdateUserNameRequest {
  name: string;
}

export interface SessionDTO {
  id: string;
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

export interface AnalyticsTimeSeriesDTO {
  date: string;
  clicks: number;
}

export interface AnalyticsBreakdownDTO {
  name: string;
  value: number;
  percentage?: number;
}

export interface AnalyticsTopLinkDTO {
  linkId: string;
  clicks: number;
  percentage?: number;
}

export interface AnalyticsTopLinkDetailsDTO {
  id: string;
  title: string;
  shortUrl: string;
  longUrl: string;
  clicks: number;
}

export interface TokenResponse {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  expiresIn?: number;
  expires_in?: number;
}

export interface OTTGenerateRequest {
  email: string;
}

export interface OTTGenerateResponse {
  message: string;
  email: string;
}

export interface OTTLoginByOtpRequest {
  loginType: "otp";
  email: string;
  code: string;
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

export interface ApiErrorResponse {
  error: string;
  message?: string;
  statusCode?: number;
  timestamp?: string;
}

