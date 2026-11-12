import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import InspectPage from "./page";
import {getBackendApiBaseUrl} from "@/lib/backend-url";
import {API_ENDPOINTS, INSPECT_PROTECTED_COPY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {ShortLinkPreviewDTO} from "@/lib/api-types";

const NOT_FOUND_SIGNAL = "NEXT_HTTP_ERROR_FALLBACK;404";

const navigation = vi.hoisted(() => ({
    notFound: vi.fn((): never => {
        throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
    }),
    redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({notFound: navigation.notFound, redirect: navigation.redirect}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const PREVIEW = {
    key: "abc123",
    shortUrl: "https://sho.rt/abc123",
    isPasswordProtected: false,
    longUrl: "https://example.com/article?x=1&y=2",
    title: "Example article",
    description: "What the article is about",
} satisfies ShortLinkPreviewDTO;

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
            `${getBackendApiBaseUrl()}${API_ENDPOINTS.SHORTLINKS_PREVIEW("abc123")}`,
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

    it("answers with the not-found page instead of redirecting when the link does not exist", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 404})));

        await expect(renderInspectPage()).rejects.toThrow(NOT_FOUND_SIGNAL);

        expect(navigation.notFound).toHaveBeenCalledOnce();
        expect(navigation.redirect).not.toHaveBeenCalled();
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

    describe("for a password-protected link", () => {
        const PROTECTED_PREVIEW: ShortLinkPreviewDTO = {key: "Secret1", shortUrl: "https://sho.rt/Secret1", isPasswordProtected: true};

        it("hides the destination and offers to open the short link", async () => {
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(PROTECTED_PREVIEW)));

            await renderInspectPage("Secret1");

            expect(screen.getByRole("heading", {name: INSPECT_PROTECTED_COPY.TITLE})).toBeInTheDocument();
            expect(screen.getByRole("link", {name: INSPECT_PROTECTED_COPY.OPEN_LINK})).toHaveAttribute("href", PROTECTED_PREVIEW.shortUrl);
            expect(screen.queryByText("Destination URL")).not.toBeInTheDocument();
        });

        it("keeps the abuse report link", async () => {
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(PROTECTED_PREVIEW)));

            await renderInspectPage("Secret1");

            expect(screen.getByRole("link", {name: "Report this link"})).toHaveAttribute(
                "href", `/report-abuse?shortUrl=${encodeURIComponent(PROTECTED_PREVIEW.shortUrl)}`,
            );
        });
    });
});
