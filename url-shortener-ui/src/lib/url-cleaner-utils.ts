import { logger } from "@/lib/logger";

export interface TrackerEntry {
    key: string;
    value: string;
    display: string;
    location: "query" | "path";
}

function extractQueryParamMap(urlString: string): Map<string, string> {
    const map = new Map<string, string>();
    try {
        const url = new URL(urlString);
        url.searchParams.forEach((value, key) => {
            if (!map.has(key)) {
                map.set(key, value);
            }
        });
        const q = url.searchParams.get("q");
        if (q) {
            try {
                const inner = new URL(decodeURIComponent(q));
                inner.searchParams.forEach((v, k) => {
                    if (!map.has(k)) map.set(k, v);
                });
            } catch {
                // ignore
            }
        }
    } catch (err) {
        logger.warn("Failed to extract query param map", { url: urlString, error: String(err) });
    }
    return map;
}

function extractPathParamValue(pathname: string, key: string): string | null {
    // Path trackers live in pathname (e.g. /dp/B001/ref=abc), not searchParams.
    const segments = pathname.split("/");
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg) continue;
        if (seg.startsWith(`${key}=`)) {
            return seg.slice(key.length + 1);
        }
        if (seg === key && i + 1 < segments.length) {
            const next = segments[i + 1];
            if (next && !next.includes("=")) {
                return next;
            }
        }
    }
    try {
        const re = new RegExp(`/${key}=([^/&?#]+)`);
        const m = pathname.match(re);
        if (m) return decodeURIComponent(m[1]);
        const re2 = new RegExp(`/${key}/([^/&?#]+)`);
        const m2 = pathname.match(re2);
        if (m2) return decodeURIComponent(m2[1]);
    } catch {
        // ignore
    }
    return null;
}

export function buildTrackerEntries(dirtyUrl: string, removedParams: string[]): TrackerEntry[] {
    if (removedParams.length === 0) return [];
    const queryMap = extractQueryParamMap(dirtyUrl);
    let pathname = "";
    try {
        pathname = new URL(dirtyUrl).pathname;
    } catch {
        pathname = dirtyUrl.split("?")[0]?.split("#")[0] ?? "";
    }

    return removedParams.map((key) => {
        const pathValue = extractPathParamValue(pathname, key);
        if (pathValue !== null) {
            return { key, value: pathValue, display: `${key}=${pathValue}`, location: "path" as const };
        }
        const qValue = queryMap.get(key) ?? "";
        const display = qValue ? `${key}=${qValue}` : key;
        return { key, value: qValue, display, location: "query" as const };
    });
}

export function getBaseUrl(cleanedUrl: string): string {
    try {
        const url = new URL(cleanedUrl);
        return `${url.origin}${url.pathname}`;
    } catch {
        return cleanedUrl.split("?")[0] ?? cleanedUrl;
    }
}

function isTrackerSegment(seg: string, removedParams: string[]): string | null {
    for (const key of removedParams) {
        if (seg === key || seg.startsWith(`${key}=`)) {
            return key;
        }
    }
    return null;
}

function isTrackerKeySegment(seg: string, removedParams: string[]): boolean {
    return removedParams.some((k) => seg === k || seg.startsWith(`${k}=`));
}

// /key/value consumes the next segment as its value; /key=value is a single segment.
function rebuildPathname(dirtyPathname: string, removedParams: string[], kept: Set<string>): string {
    const segments = dirtyPathname.split("/");
    const keptSegments: string[] = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg === "" && i === 0) {
            keptSegments.push("");
            continue;
        }
        if (!seg) continue;
        const trackerKey = isTrackerSegment(seg, removedParams);
        if (trackerKey === null) {
            keptSegments.push(seg);
            continue;
        }
        if (kept.has(trackerKey)) {
            keptSegments.push(seg);
            if (seg === trackerKey && i + 1 < segments.length) {
                const nextVal = segments[i + 1];
                if (nextVal && !isTrackerKeySegment(nextVal, removedParams)) {
                    keptSegments.push(nextVal);
                    i++;
                }
            }
        } else if (seg === trackerKey && i + 1 < segments.length) {
            const nextVal = segments[i + 1];
            if (nextVal && !isTrackerKeySegment(nextVal, removedParams)) {
                i++;
            }
        }
    }
    let rebuilt = keptSegments.join("/") || "/";
    if (!rebuilt.startsWith("/")) rebuilt = `/${rebuilt}`;
    rebuilt = rebuilt.replace(/\/{2,}/g, "/");
    return rebuilt;
}

export function buildFinalUrl(
    dirtyUrl: string,
    cleanedUrl: string,
    entries: TrackerEntry[],
    kept: Set<string>,
): string {
    if (kept.size === 0) return cleanedUrl;
    const keptEntries = entries.filter((e) => kept.has(e.key));
    if (keptEntries.length === 0) return cleanedUrl;

    try {
        const dirty = new URL(dirtyUrl);
        const cleaned = new URL(cleanedUrl);

        const sameOrigin = dirty.origin === cleaned.origin;

        let finalPathname = cleaned.pathname;
        const hasPathTrackers = keptEntries.some((e) => e.location === "path");
        if (sameOrigin && hasPathTrackers) {
            const removedKeys = entries.map((e) => e.key);
            finalPathname = rebuildPathname(dirty.pathname, removedKeys, kept);
        }

        const finalUrl = new URL(cleaned.origin);
        finalUrl.pathname = finalPathname;
        finalUrl.hash = cleaned.hash;

        if (sameOrigin) {
            // Reconstruct query from dirty in original order to preserve position.
            const removedSet = new Set(entries.map((e) => e.key));
            const keptQueryMap = new Map<string, string>();
            keptEntries.forEach((e) => {
                if (e.location === "query") keptQueryMap.set(e.key, e.value);
            });
            const seen = new Set<string>();
            dirty.searchParams.forEach((value, key) => {
                if (seen.has(key)) return;
                seen.add(key);
                if (removedSet.has(key)) {
                    if (keptQueryMap.has(key)) {
                        finalUrl.searchParams.append(key, keptQueryMap.get(key) ?? value);
                    }
                } else {
                    finalUrl.searchParams.append(key, value);
                }
            });
            keptEntries.forEach((e) => {
                if (e.location === "query" && !finalUrl.searchParams.has(e.key)) {
                    finalUrl.searchParams.set(e.key, e.value);
                }
            });
            cleaned.searchParams.forEach((value, key) => {
                if (!finalUrl.searchParams.has(key) && !removedSet.has(key)) {
                    finalUrl.searchParams.set(key, value);
                }
            });
        } else {
            // Redirect unwrapped to a different origin: cleaned query is the base.
            cleaned.searchParams.forEach((value, key) => {
                finalUrl.searchParams.set(key, value);
            });
            keptEntries.forEach((e) => {
                if (e.location === "query") {
                    finalUrl.searchParams.set(e.key, e.value);
                }
            });
        }

        return finalUrl.toString();
    } catch {
        const keptQuery = keptEntries.filter((e) => e.location === "query").map((e) => e.display).join("&");
        const keptPathSegments = keptEntries
            .filter((e) => e.location === "path")
            .map((e) => `/${e.display}`);
        let base = cleanedUrl.split("?")[0] ?? cleanedUrl;
        if (keptPathSegments.length > 0) {
            base = base.replace(/\/$/, "") + keptPathSegments.join("");
        }
        if (keptQuery) {
            const hasQ = cleanedUrl.includes("?") || base.includes("?");
            return `${base}${hasQ ? "&" : "?"}${keptQuery}`;
        }
        return base;
    }
}
