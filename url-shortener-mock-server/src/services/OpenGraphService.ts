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

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
  } catch {
    return {};
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    return {};
  }

  const reader = response.body?.getReader();
  if (!reader) return {};

  let html = "";

  try {
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (received < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      received += value.byteLength;
    }
    const buffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    html = new TextDecoder().decode(buffer);
  } catch {
    return {};
  } finally {
    await reader.cancel().catch(() => {});
  }

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
