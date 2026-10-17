"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
import { HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_UNAUTHORIZED } from "@/lib/http-status";
import { API_ENDPOINTS, URL_CLEANER_DEBOUNCE_MS } from "@/lib/constants";
import type { UrlCleanerResponse } from "@/lib/api-types";
import { isValidUrl, normalizeUrl } from "@/lib/url-utils";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { logger } from "@/lib/logger";

interface UseUrlCleanerOptions {
    enabled: boolean;
    url: string;
}

interface UseUrlCleanerResult {
    result: UrlCleanerResponse | null;
}

const QUIETLY_IGNORED_STATUSES: readonly number[] = [HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_FORBIDDEN];

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

/** The cleaned URL when the backend removed trackers from `url`, otherwise `null` (also on any failure). */
async function requestTrackerCleanup(url: string, signal: AbortSignal): Promise<UrlCleanerResponse | null> {
    try {
        const res = await fetchWithAuth(API_ENDPOINTS.URL_CLEANER, {
            method: "POST",
            body: JSON.stringify({ url }),
            signal,
        });
        if (signal.aborted || QUIETLY_IGNORED_STATUSES.includes(res.status)) return null;
        if (!res.ok) {
            logger.warn("URL cleaner check failed", { status: res.status });
            return null;
        }
        const data: UrlCleanerResponse = await res.json();
        const hasTrackers = data.removedParams.length > 0 && !data.completeProviderSkipped;
        return hasTrackers && data.url !== url ? data : null;
    } catch (err) {
        if (!signal.aborted && !isAbortError(err)) logger.warn("URL cleaner request error", { error: String(err) });
        return null;
    }
}

function shouldSkipCleaner(url: string): boolean {
    if (!url.trim()) return true;
    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) return true;
    return false;
}

export function useUrlCleaner({ enabled, url }: UseUrlCleanerOptions): UseUrlCleanerResult {
    const debouncedUrl = useDebounce(url, URL_CLEANER_DEBOUNCE_MS);
    const [result, setResult] = useState<UrlCleanerResponse | null>(null);
    const lastRequestedUrlRef = useRef<string | null>(null);

    // Suppress stale banner as soon as the input changes and dedupe identical URLs.
    useEffect(() => {
        if (shouldSkipCleaner(url)) {
            setResult(null);
            return;
        }

        const normalizedImmediate = normalizeUrl(url);
        if (lastRequestedUrlRef.current !== null && normalizedImmediate !== lastRequestedUrlRef.current) {
            setResult(null);
        }
    }, [url]);

    useEffect(() => {
        if (!enabled) {
            setResult(null);
            return;
        }

        if (shouldSkipCleaner(debouncedUrl)) {
            setResult(null);
            return;
        }

        const normalized = normalizeUrl(debouncedUrl);

        if (lastRequestedUrlRef.current === normalized) {
            return;
        }

        let cancelled = false;
        const controller = new AbortController();
        lastRequestedUrlRef.current = normalized;

        const checkUrl = async (): Promise<void> => {
            const cleanedUrl = await requestTrackerCleanup(normalized, controller.signal);
            if (cancelled || controller.signal.aborted) return;
            setResult(cleanedUrl);
        };

        void checkUrl();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [debouncedUrl, enabled]);

    return { result };
}
