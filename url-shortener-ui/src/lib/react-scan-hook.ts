import fs from "node:fs";
import {createRequire} from "node:module";
import {logger} from "@/lib/logger";

const REACT_SCAN_HOOK_MODULE = "react-scan/dist/install-hook.global.js";

export function getReactScanHook(): string | undefined {
    if (process.env.NODE_ENV !== "development") return undefined;

    // React must see the observer hook before its renderer loads, earlier than client instrumentation runs.
    // Node resolves the package at runtime (Turbopack would turn the path into a module id), and a missing install
    // only turns the highlighting off instead of breaking every page.
    try {
        const hookPath = createRequire(import.meta.url).resolve(/* turbopackIgnore: true */ REACT_SCAN_HOOK_MODULE);
        return fs.readFileSync(hookPath, "utf8");
    } catch (error) {
        logger.warn("React Scan hook could not be read; render highlighting is off", {
            reason: error instanceof Error ? error.message : String(error),
        });
        return undefined;
    }
}
