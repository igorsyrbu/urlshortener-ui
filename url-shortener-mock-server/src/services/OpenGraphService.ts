import { parse } from "node-html-parser";

const FETCH_TIMEOUT_MS = 3_000;
const MAX_BODY_BYTES = 50 * 1024;

interface OpenGraphData {
  title?: string;
  description?: string;
  ogImageUrl?: string;
}

export async function fetchOpenGraph(url: string): Promise<OpenGraphData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const html = await fetchHtmlHead(url, controller.signal);
    return html === undefined ? {} : parseOpenGraph(html);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchHtmlHead(url: string, signal: AbortSignal): Promise<string | undefined> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
  } catch {
    return undefined;
  }

  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    return undefined;
  }

  const reader = response.body?.getReader();
  if (!reader) return undefined;
  return readCappedBody(reader, signal);
}

async function readCappedBody(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal): Promise<string | undefined> {
  // A body stream is not guaranteed to error when the fetch signal aborts, so a stalled body is cancelled explicitly.
  const cancelOnAbort = (): void => { reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", cancelOnAbort, { once: true });
  try {
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (received < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = MAX_BODY_BYTES - received;
      chunks.push(value.byteLength > remaining ? value.subarray(0, remaining) : value);
      received += Math.min(value.byteLength, remaining);
    }
    if (signal.aborted) return undefined;
    return new TextDecoder().decode(concatChunks(chunks, received));
  } catch {
    return undefined;
  } finally {
    signal.removeEventListener("abort", cancelOnAbort);
    await reader.cancel().catch(() => {});
  }
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const buffer = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

function parseOpenGraph(html: string): OpenGraphData {
  const root = parse(html);
  const title = root.querySelector("title")?.text?.trim();
  const description = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim();
  const ogImageUrl = root.querySelector('meta[property="og:image"]')?.getAttribute("content")?.trim();

  return {
    title: title || undefined,
    description: description || undefined,
    ogImageUrl: ogImageUrl || undefined,
  };
}
