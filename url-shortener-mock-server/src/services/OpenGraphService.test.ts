import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { fetchOpenGraph } from "./OpenGraphService";

const PAGE_URL = "https://example.com/article";
const FETCH_TIMEOUT_MS = 3_000;
const MAX_BODY_BYTES = 50 * 1024;
const HTTP_NOT_FOUND = 404;
const HTML_CONTENT_TYPE = "text/html; charset=utf-8";

type FetchStub = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function stubFetch(implementation: FetchStub) {
  return mock.method(globalThis, "fetch", implementation);
}

function respondWithHtml(html: string, init: ResponseInit = {}): FetchStub {
  return async () => new Response(html, { status: 200, headers: { "content-type": HTML_CONTENT_TYPE }, ...init });
}

function createPage(head: string): string {
  return `<html><head>${head}</head><body></body></html>`;
}

beforeEach(() => {
  mock.timers.enable({ apis: ["setTimeout"] });
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
});

describe("fetchOpenGraph parsing", () => {
  it("extracts trimmed title, description and og:image", async () => {
    stubFetch(respondWithHtml(createPage(
      `<title>  Hello World </title>
       <meta name="description" content=" A summary ">
       <meta property="og:image" content=" https://example.com/cover.png ">`,
    )));
    assert.deepEqual(await fetchOpenGraph(PAGE_URL), {
      title: "Hello World",
      description: "A summary",
      ogImageUrl: "https://example.com/cover.png",
    });
  });

  it("omits metadata that is missing or blank", async () => {
    stubFetch(respondWithHtml(createPage(`<title>   </title><meta name="description" content="">`)));
    assert.deepEqual(await fetchOpenGraph(PAGE_URL), { title: undefined, description: undefined, ogImageUrl: undefined });
  });

  it("requests html and follows redirects", async () => {
    const fetchStub = stubFetch(respondWithHtml(createPage("<title>T</title>")));
    await fetchOpenGraph(PAGE_URL);
    const [url, init] = fetchStub.mock.calls[0].arguments;
    assert.equal(url, PAGE_URL);
    assert.equal(init?.redirect, "follow");
    assert.deepEqual(init?.headers, { Accept: "text/html" });
  });

  it("stops reading chunks once the body size limit is reached", async () => {
    const encoder = new TextEncoder();
    const firstChunk = `<html><head><title>Early</title></head><body>${"x".repeat(MAX_BODY_BYTES)}`;
    const lateChunk = '<meta name="description" content="Late"></body></html>';
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(firstChunk));
        controller.enqueue(encoder.encode(lateChunk));
        controller.close();
      },
    });
    stubFetch(async () => new Response(body, { status: 200, headers: { "content-type": HTML_CONTENT_TYPE } }));
    const result = await fetchOpenGraph(PAGE_URL);
    assert.equal(result.title, "Early");
    assert.equal(result.description, undefined);
  });
});

describe("fetchOpenGraph failures", () => {
  it("returns an empty result when the request fails", async () => {
    stubFetch(async () => { throw new TypeError("network down"); });
    assert.deepEqual(await fetchOpenGraph(PAGE_URL), {});
  });

  it("returns an empty result for an error status", async () => {
    stubFetch(respondWithHtml("<title>Missing</title>", { status: HTTP_NOT_FOUND }));
    assert.deepEqual(await fetchOpenGraph(PAGE_URL), {});
  });

  it("returns an empty result for a non-html content type", async () => {
    stubFetch(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    assert.deepEqual(await fetchOpenGraph(PAGE_URL), {});
  });

  it("returns an empty result when the response has no content type", async () => {
    stubFetch(async () => new Response("<title>T</title>", { status: 200, headers: {} }));
    const result = await fetchOpenGraph(PAGE_URL);
    assert.deepEqual(result, {});
  });

  it("aborts a request that exceeds the timeout", async () => {
    stubFetch((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const pending = fetchOpenGraph(PAGE_URL);
    mock.timers.tick(FETCH_TIMEOUT_MS);
    assert.deepEqual(await pending, {});
  });

  it("returns an empty result when reading the body fails", async () => {
    const failingBody = new ReadableStream<Uint8Array>({
      pull(controller) { controller.error(new Error("connection reset")); },
    });
    stubFetch(async () => new Response(failingBody, { status: 200, headers: { "content-type": HTML_CONTENT_TYPE } }));
    assert.deepEqual(await fetchOpenGraph(PAGE_URL), {});
  });
});
