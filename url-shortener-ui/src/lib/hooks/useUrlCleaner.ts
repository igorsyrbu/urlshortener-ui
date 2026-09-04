"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "@/lib/api";
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
            try {
                const res = await fetchWithAuth(API_ENDPOINTS.URL_CLEANER, {
                    method: "POST",
                    body: JSON.stringify({ url: normalized }),
                    signal: controller.signal,
                });

                if (cancelled || controller.signal.aborted) return;

                if (res.status === 401 || res.status === 403) {
                    setResult(null);
                    return;
                }

                if (res.status === 400) {
                    setResult(null);
                    return;
                }

                if (!res.ok) {
                    logger.warn("URL cleaner check failed", { status: res.status });
                    setResult(null);
                    return;
                }

                const data = (await res.json()) as UrlCleanerResponse;

                if (cancelled || controller.signal.aborted) return;

                const hasTrackers = data.removedParams.length > 0 && !data.completeProviderSkipped;
                const isChanged = data.url !== normalized;

                if (hasTrackers && isChanged) {
                    setResult(data);
                } else {
                    setResult(null);
                }
            } catch (err) {
                if (cancelled || controller.signal.aborted) return;
                if (err instanceof DOMException && err.name === "AbortError") return;
                logger.warn("URL cleaner request error", { error: String(err) });
                setResult(null);
            }
        };

        void checkUrl();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [debouncedUrl, enabled]);

    return { result };
}
