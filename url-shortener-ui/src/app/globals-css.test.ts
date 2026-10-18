import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

const APP_DIR = join(process.cwd(), "src/app");
const globalsCss = readFileSync(join(APP_DIR, "globals.css"), "utf8");
const rootLayout = readFileSync(join(APP_DIR, "layout.tsx"), "utf8");

function fontTokenValues(): Map<string, string> {
    const tokens = new Map<string, string>();
    for (const match of globalsCss.matchAll(/(--font-[\w-]+):\s*([^;]+);/g)) tokens.set(match[1], match[2]);
    return tokens;
}

function definedVariables(): Set<string> {
    const cssVariables = [...globalsCss.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]);
    const nextFontVariables = [...rootLayout.matchAll(/variable:\s*["'](--[\w-]+)["']/g)].map((match) => match[1]);
    return new Set([...cssVariables, ...nextFontVariables]);
}

describe("globals.css font tokens", () => {
    it("only reference variables that exist, so no font silently falls back to the body font", () => {
        const defined = definedVariables();
        const missing = [...fontTokenValues()].flatMap(([token, value]) =>
            [...value.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]).filter((name) => !defined.has(name)).map((name) => `${token} -> ${name}`),
        );

        expect(missing).toEqual([]);
    });

    it("gives code text a monospace font", () => {
        expect(fontTokenValues().get("--font-mono")).toMatch(/monospace\s*$/);
    });
});
