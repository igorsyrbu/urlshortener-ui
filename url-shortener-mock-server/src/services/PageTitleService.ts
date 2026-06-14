import { parse, HTMLElement } from "node-html-parser";

const FETCH_TIMEOUT_MS = 3_000;
const MAX_BODY_BYTES = 100 * 1024; // Increased to 100KB for better metadata coverage

export interface UrlMetadata {
  title: string;
  description: string;
  favicon: string;
}

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { 
        "User-Agent": "Mozilla/5.0 (compatible; UrlShortenerBot/1.0; +https://sho.rt)",
        "Accept": "text/html" 
      },
    });

    validateResponse(response);

    const html = await readBody(response);
    const root = parse(html);

    const title = extractTitle(root);
    const description = extractDescription(root);
    const favicon = extractFavicon(root, url);

    return { title, description, favicon };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(`Timeout: Failed to fetch metadata within ${FETCH_TIMEOUT_MS}ms`);
    }
    if (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") {
      throw new Error(`DNS Error: Could not resolve host for ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Legacy support for fetching only the title.
 */
export async function fetchPageTitle(url: string): Promise<string> {
  const metadata = await fetchUrlMetadata(url);
  return metadata.title;
}

function validateResponse(response: FetchResponse): void {
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`Invalid Content-Type: Expected text/html but got ${contentType}`);
  }
}

async function readBody(response: FetchResponse): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is empty");

  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (received < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      received += value.byteLength;
    }
  } finally {
    await reader.cancel();
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(buffer);
}

function extractTitle(root: HTMLElement): string {
  // Priority: og:title -> title tag -> twitter:title
  return (
    root.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    root.querySelector('meta[name="og:title"]')?.getAttribute("content") ||
    root.querySelector("title")?.text ||
    root.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
    ""
  ).trim();
}

function extractDescription(root: HTMLElement): string {
  // Priority: description -> og:description -> twitter:description
  return (
    root.querySelector('meta[name="description"]')?.getAttribute("content") ||
    root.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
    root.querySelector('meta[name="og:description"]')?.getAttribute("content") ||
    root.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ||
    ""
  ).trim();
}

function extractFavicon(root: HTMLElement, baseUrl: string): string {
  const iconSelectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="icon"]',
    'link[rel="icon shortcut"]',
  ];

  let faviconUrl = "";
  for (const selector of iconSelectors) {
    const href = root.querySelector(selector)?.getAttribute("href");
    if (href) {
      faviconUrl = href;
      break;
    }
  }

  if (!faviconUrl) {
    try {
      const url = new URL(baseUrl);
      return `${url.origin}/favicon.ico`;
    } catch {
      return "";
    }
  }

  // Resolve relative URLs
  try {
    return new URL(faviconUrl, baseUrl).href;
  } catch {
    return faviconUrl;
  }
}
