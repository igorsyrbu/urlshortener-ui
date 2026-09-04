export interface CleanedUrl {
  url: string;
  removedParams: string[];
  completeProviderSkipped: boolean;
}

// Query params treated as trackers and stripped.
const TRACKER_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "cvid",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "ttclid",
  "twclid",
  "li_fat_id",
  "dclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "referrer",
]);

function tryUnwrapRedirect(url: URL): URL {
  if (url.pathname !== "/url") return url;
  const inner = url.searchParams.get("q");
  if (!inner) return url;
  try {
    const decoded = new URL(decodeURIComponent(inner));
    if (decoded.protocol === "http:" || decoded.protocol === "https:") {
      return decoded;
    }
  } catch {
    // Not an unwrappable redirect — clean the outer URL as-is.
  }
  return url;
}

export function cleanUrl(input: string): CleanedUrl {
  const parsed = new URL(input);

  const target = tryUnwrapRedirect(parsed);
  const removedParams: string[] = [];

  // Iterate a snapshot: deleting while iterating URLSearchParams skips entries.
  for (const key of Array.from(target.searchParams.keys())) {
    if (TRACKER_PARAMS.has(key) && !removedParams.includes(key)) {
      removedParams.push(key);
    }
  }
  for (const key of removedParams) {
    target.searchParams.delete(key);
  }

  return { url: target.toString(), removedParams, completeProviderSkipped: false };
}
