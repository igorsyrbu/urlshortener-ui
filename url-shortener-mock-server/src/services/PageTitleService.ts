import { parse } from "node-html-parser";

const FETCH_TIMEOUT_MS = 3_000;
const MAX_BODY_BYTES = 50 * 1024; // 50KB

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

export async function fetchPageTitle(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal,
    redirect: "follow",
    headers: { Accept: "text/html" },
  }).finally(() => clearTimeout(timeoutId));

  validateContentType(response);

  const html = await readBody(response);
  const title = parse(html).querySelector("title")?.text?.trim() ?? "";

  if (!title) throw new Error("<title> tag is blank");

  return title;
}

function validateContentType(response: FetchResponse): void {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType) throw new Error("Missing content-type header");

  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`Content-Type is not HTML: ${contentType}`);
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
