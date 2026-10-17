import {describe, expect, it, vi} from "vitest";
import {metadata, viewport} from "@/app/layout";
import {APP_NAME} from "@/lib/constants";

vi.mock("next/font/google", () => ({
    Manrope: () => ({variable: "font-manrope", className: "font-manrope"}),
}));

describe("root layout viewport", () => {
    it("lets users pinch-zoom the page", () => {
        expect(viewport).not.toHaveProperty("maximumScale");
        expect(viewport).not.toHaveProperty("userScalable");
    });
});

describe("root layout metadata", () => {
    it("titles every page as \"<page> | Short Links\" and falls back to the app name", () => {
        expect(metadata.title).toEqual({default: APP_NAME, template: `%s | ${APP_NAME}`});
    });
});
