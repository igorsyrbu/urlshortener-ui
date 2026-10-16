import {describe, expect, it, vi} from "vitest";
import {viewport} from "@/app/layout";

vi.mock("next/font/google", () => ({
    Manrope: () => ({variable: "font-manrope", className: "font-manrope"}),
}));

describe("root layout viewport", () => {
    it("lets users pinch-zoom the page", () => {
        expect(viewport).not.toHaveProperty("maximumScale");
        expect(viewport).not.toHaveProperty("userScalable");
    });
});
