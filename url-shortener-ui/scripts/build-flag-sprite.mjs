// Rebuilds src/components/analytics/flags/{circle-flags.svg,flag-codes.ts} from a circle-flags checkout
// (https://github.com/HatScripts/circle-flags, MIT): node scripts/build-flag-sprite.mjs <circle-flags>/flags
import {readdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";

const OUTPUT_DIR = new URL("../src/components/analytics/flags/", import.meta.url);
const COUNTRY_CODE = /^[a-z]{2}$/;
const CODES_PER_LINE = 12;
const FORBIDDEN = /<\s*(script|foreignObject|iframe|image)\b|\son[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=\s*"(?!#)/i;
const FLAG_ROOT = /^\s*<svg\b[^>]*viewBox="0 0 512 512"[^>]*>([\s\S]*)<\/svg>\s*$/;

// Every flag reuses ids such as `mask id="a"`; inside one sprite they must be unique, so prefix them with the code.
function toSymbol(code, source) {
    if (FORBIDDEN.test(source)) throw new Error(`Refusing ${code}.svg: active or external content`);
    const match = FLAG_ROOT.exec(source);
    if (!match) throw new Error(`Unexpected root element in ${code}.svg`);
    const inner = match[1]
        .replace(/\bid="([^"]+)"/g, (_, id) => `id="${code}-${id}"`)
        .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${code}-${id})`)
        .replace(/((?:xlink:)?href)="#([^"]+)"/g, (_, attribute, id) => `${attribute}="#${code}-${id}"`);
    return `<symbol id="${code}" viewBox="0 0 512 512">${inner}</symbol>`;
}

function buildCodesModule(codes) {
    const lines = [];
    for (let index = 0; index < codes.length; index += CODES_PER_LINE) {
        lines.push(`    ${codes.slice(index, index + CODES_PER_LINE).map((code) => `"${code}"`).join(", ")},`);
    }
    return [
        "// Generated from the circle-flags sprite next to this file; regenerate both together.",
        "export const FLAG_CODES: ReadonlySet<string> = new Set([",
        ...lines,
        "]);",
        "",
    ].join("\n");
}

const flagsDir = process.argv[2];
if (!flagsDir) throw new Error("Usage: node scripts/build-flag-sprite.mjs <circle-flags>/flags");
const codes = readdirSync(flagsDir).map((file) => file.replace(/\.svg$/, "")).filter((code) => COUNTRY_CODE.test(code)).sort();
const symbols = codes.map((code) => toSymbol(code, readFileSync(join(flagsDir, `${code}.svg`), "utf8")));
// Next.js reads an imported SVG's dimensions; the sprite root itself is never drawn.
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 512 512">${symbols.join("")}</svg>\n`;
writeFileSync(new URL("circle-flags.svg", OUTPUT_DIR), sprite);
writeFileSync(new URL("flag-codes.ts", OUTPUT_DIR), buildCodesModule(codes));
console.log(`${codes.length} flags written`);
