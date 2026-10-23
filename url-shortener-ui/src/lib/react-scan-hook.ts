import fs from "node:fs";
import path from "node:path";

export function getReactScanHook(): string | undefined {
    if (process.env.NODE_ENV !== "development") return undefined;

    // React must see the observer hook before its renderer loads, earlier than client instrumentation runs.
    const hookPath = path.join(process.cwd(), "node_modules/react-scan/dist/install-hook.global.js");
    return fs.readFileSync(hookPath, "utf8");
}
