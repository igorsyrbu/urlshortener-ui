import {describe, expect, it} from "vitest";
import {TOKEN_CSS_VAR_NAMES, TOKEN_ENTRIES} from "@/lib/themes/theme-tokens";

describe("theme tokens", () => {
    it("exposes one entry per token", () => {
        expect(TOKEN_ENTRIES).toHaveLength(Object.keys(TOKEN_CSS_VAR_NAMES).length);
    });

    it("maps every token to a unique CSS custom property", () => {
        const names = Object.values(TOKEN_CSS_VAR_NAMES);

        expect(names.every((name) => name.startsWith("--"))).toBe(true);
        expect(new Set(names).size).toBe(names.length);
    });

    it("names custom properties after the kebab-cased token", () => {
        for (const [token, cssVar] of TOKEN_ENTRIES) {
            expect(cssVar).toBe(`--${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
        }
    });
});
