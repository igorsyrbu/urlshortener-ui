#!/usr/bin/env node
// Fails when a route's first-load JS (gzip) or the largest chunk exceeds bundle-budgets.json.
// Turbopack prints no per-route sizes, so the sizes come from .next/diagnostics/route-bundle-stats.json.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const BYTES_PER_KB = 1024;
const GZIP_LEVEL = 9;
const CHUNKS_DIR = ".next/static/chunks";
const projectDir = process.cwd();
const budgets = JSON.parse(fs.readFileSync(path.join(projectDir, "bundle-budgets.json"), "utf8"));
const routeStats = JSON.parse(fs.readFileSync(path.join(projectDir, ".next/diagnostics/route-bundle-stats.json"), "utf8"));

const gzipSizeCache = new Map();

function gzipSizeKb(relativePath) {
    if (!gzipSizeCache.has(relativePath)) {
        const content = fs.readFileSync(path.join(projectDir, relativePath));
        gzipSizeCache.set(relativePath, zlib.gzipSync(content, {level: GZIP_LEVEL}).length / BYTES_PER_KB);
    }
    return gzipSizeCache.get(relativePath);
}

function firstLoadKb(route) {
    return route.firstLoadChunkPaths.reduce((total, chunkPath) => total + gzipSizeKb(chunkPath), 0);
}

function largestChunk() {
    return fs.readdirSync(path.join(projectDir, CHUNKS_DIR))
        .filter((fileName) => fileName.endsWith(".js"))
        .map((fileName) => ({fileName, kb: gzipSizeKb(`${CHUNKS_DIR}/${fileName}`)}))
        .reduce((largest, chunk) => (chunk.kb > largest.kb ? chunk : largest));
}

function formatRow(label, actualKb, budgetKb, note = "") {
    const headroomKb = budgetKb - actualKb;
    return `${label.padEnd(22)} ${actualKb.toFixed(1).padStart(7)} KB / ${String(budgetKb).padStart(4)} KB  (${headroomKb >= 0 ? "+" : ""}${headroomKb.toFixed(1)})${note}`;
}

const failures = [];
const rows = [];

for (const route of routeStats) {
    const budgetKb = budgets.routes[route.route] ?? budgets.defaultRouteKb;
    const actualKb = firstLoadKb(route);
    rows.push(formatRow(route.route, actualKb, budgetKb));
    if (actualKb > budgetKb) failures.push(`${route.route}: ${actualKb.toFixed(1)} KB gzip exceeds its budget of ${budgetKb} KB`);
}

const largest = largestChunk();
rows.push(formatRow("largest chunk", largest.kb, budgets.maxSingleChunkKb, `  ${largest.fileName}`));
if (largest.kb > budgets.maxSingleChunkKb) {
    failures.push(`chunk ${largest.fileName}: ${largest.kb.toFixed(1)} KB gzip exceeds ${budgets.maxSingleChunkKb} KB`);
}

console.log(rows.join("\n"));
if (failures.length > 0) {
    console.error(`\nBundle budget exceeded:\n  ${failures.join("\n  ")}`);
    process.exit(1);
}
