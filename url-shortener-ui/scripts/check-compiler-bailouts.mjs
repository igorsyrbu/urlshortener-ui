#!/usr/bin/env node
// Fails when the React Compiler skips (bails out on) any component or hook. `next build` fails on the same condition
// (panicThreshold "all_errors"); this check finds it in seconds, without a build, and names every function at once.
import {createRequire} from "node:module";
import {readdirSync, readFileSync, statSync} from "node:fs";
import {dirname, join, relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(APP_DIR, "src");
const TEST_SUPPORT_DIR = join(SOURCE_DIR, "test");
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const EXCLUDED_FILE_PATTERN = /\.(test|spec|perf\.test)\.|\.d\.ts$/;
const MAX_REASON_LENGTH = 160;

const appRequire = createRequire(join(APP_DIR, "package.json"));
const babel = appRequire("@babel/core");
const compilerPlugin = appRequire("babel-plugin-react-compiler");

function listSourceFiles(directory, files = []) {
    for (const entry of readdirSync(directory)) {
        const entryPath = join(directory, entry);
        if (entryPath === TEST_SUPPORT_DIR) continue;
        if (statSync(entryPath).isDirectory()) listSourceFiles(entryPath, files);
        else if (SOURCE_FILE_PATTERN.test(entry) && !EXCLUDED_FILE_PATTERN.test(entry)) files.push(entryPath);
    }
    return files;
}

function describeEvent(event) {
    const detail = event.detail?.options ?? event.detail ?? {};
    const reason = String(detail.reason ?? event.reason ?? event.data ?? "unknown").replace(/\s+/g, " ").slice(0, MAX_REASON_LENGTH);
    return `${detail.category ?? event.kind}: ${reason}`;
}

let compiledFunctions = 0;
const bailouts = [];

for (const file of listSourceFiles(SOURCE_DIR)) {
    const relativePath = relative(APP_DIR, file);
    const logger = {
        logEvent(_filename, event) {
            if (event.kind === "CompileSuccess") compiledFunctions++;
            else if (["CompileError", "CompileDiagnostic", "PipelineError"].includes(event.kind)) {
                bailouts.push(`${relativePath}:${event.fnLoc?.start.line ?? 0}  ${describeEvent(event)}`);
            }
        },
    };
    babel.transformSync(readFileSync(file, "utf8"), {
        filename: file,
        babelrc: false,
        configFile: false,
        parserOpts: {plugins: ["typescript", "jsx"]},
        plugins: [[compilerPlugin.default ?? compilerPlugin, {panicThreshold: "none", logger}]],
    });
}

console.log(`React Compiler: ${compiledFunctions} functions compiled, ${bailouts.length} bailouts.`);
if (bailouts.length > 0) {
    console.error(`\nThe compiler skipped these functions (see aidocs/coding-patterns.md, React Compiler):\n  ${bailouts.join("\n  ")}`);
    process.exit(1);
}
