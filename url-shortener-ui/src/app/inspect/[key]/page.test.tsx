import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import InspectPage from "./page";
import {SERVER_API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {ShortLinkPreviewDTO} from "@/lib/api-types";

const REDIRECT_SIGNAL = "NEXT_REDIRECT";

const navigation = vi.hoisted(() => ({
    redirect: vi.fn((): never => {
        throw new Error("NEXT_REDIRECT");
    }),
}));

vi.mock("next/navigation", () => ({redirect: navigation.redirect}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const PREVIEW: ShortLinkPreviewDTO = {
    key: "abc123",
    shortUrl: "https://sho.rt/abc123",
    longUrl: "https://example.com/article?x=1&y=2",
    title: "Example article",
    description: "What the article is about",
};

async function renderInspectPage(key = "abc123"): Promise<void> {
    const page = await InspectPage({params: Promise.resolve({key})});
    render(page);
}

describe("inspect page", () => {
    it("requests the preview of the key without caching", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json(PREVIEW));
        vi.stubGlobal("fetch", fetchMock);

        await renderInspectPage("abc123");

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            `${SERVER_API_BASE_URL}${API_ENDPOINTS.SHORTLINKS_PREVIEW("abc123")}`,
            {cache: "no-store"},
        );
    });

    it("shows the preview and the full destination URL", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(PREVIEW)));

        await renderInspectPage();

        expect(screen.getByRole("heading", {name: "Link Inspector"})).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: PREVIEW.title})).toBeInTheDocument();
        expect(screen.getByText(PREVIEW.longUrl)).toBeInTheDocument();
    });

    it("links to the abuse report prefilled with the encoded short URL", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(PREVIEW)));

        await renderInspectPage();

        expect(screen.getByRole("link", {name: "Report this link"}))
            .toHaveAttribute("href", `/report-abuse?shortUrl=${encodeURIComponent(PREVIEW.shortUrl)}`);
    });

    it("sends the visitor home when the link does not exist", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 404})));

        await expect(renderInspectPage()).rejects.toThrow(REDIRECT_SIGNAL);

        expect(navigation.redirect).toHaveBeenCalledExactlyOnceWith("/");
    });

    it("logs and rethrows when the preview service fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 500})));

        await expect(renderInspectPage()).rejects.toThrow("Preview fetch failed: 500");

        expect(logger.error).toHaveBeenCalledExactlyOnceWith("Failed to fetch link preview", expect.any(Error), {key: "abc123"});
    });

    it("logs and rethrows when the request itself fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

        await expect(renderInspectPage()).rejects.toThrow("offline");

        expect(logger.error).toHaveBeenCalledOnce();
    });
});
