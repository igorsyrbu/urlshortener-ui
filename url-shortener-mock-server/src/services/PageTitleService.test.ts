import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUrlMetadata } from "./PageTitleService";

describe("PageTitleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract metadata from a basic HTML page", async () => {
    const mockHtml = `
      <html>
        <head>
          <title>Basic Title</title>
          <meta name="description" content="Basic Description">
          <link rel="icon" href="/favicon.ico">
        </head>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          const data = encoder.encode(mockHtml);
          let read = false;
          return {
            read: () => {
              if (read) return Promise.resolve({ done: true });
              read = true;
              return Promise.resolve({ done: false, value: data });
            },
            cancel: () => Promise.resolve(),
          };
        },
      },
    });

    const metadata = await fetchUrlMetadata("https://example.com");
    expect(metadata.title).toBe("Basic Title");
    expect(metadata.description).toBe("Basic Description");
    expect(metadata.favicon).toBe("https://example.com/favicon.ico");
  });

  it("should prioritize OpenGraph tags", async () => {
    const mockHtml = `
      <html>
        <head>
          <title>Standard Title</title>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG Description">
        </head>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          const data = encoder.encode(mockHtml);
          let read = false;
          return {
            read: () => {
              if (read) return Promise.resolve({ done: true });
              read = true;
              return Promise.resolve({ done: false, value: data });
            },
            cancel: () => Promise.resolve(),
          };
        },
      },
    });

    const metadata = await fetchUrlMetadata("https://example.com");
    expect(metadata.title).toBe("OG Title");
    expect(metadata.description).toBe("OG Description");
  });

  it("should handle relative favicon URLs", async () => {
    const mockHtml = `
      <html>
        <head>
          <link rel="shortcut icon" href="assets/icon.png">
        </head>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
      body: {
        getReader: () => {
          const encoder = new TextEncoder();
          const data = encoder.encode(mockHtml);
          let read = false;
          return {
            read: () => {
              if (read) return Promise.resolve({ done: true });
              read = true;
              return Promise.resolve({ done: false, value: data });
            },
            cancel: () => Promise.resolve(),
          };
        },
      },
    });

    const metadata = await fetchUrlMetadata("https://example.com/sub/page.html");
    expect(metadata.favicon).toBe("https://example.com/sub/assets/icon.png");
  });

  it("should throw error for non-HTML content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "application/json"]]),
    });

    await expect(fetchUrlMetadata("https://example.com/api")).rejects.toThrow("Invalid Content-Type");
  });
});
