import {readFileSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

const PROJECT_DIR = path.resolve(__dirname, "../..");
const CONFIG_IMPORT_PATTERN = /from\s+"(\.\/src\/[^"]+)"/g;
const ALIAS_IMPORT_PATTERN = /from\s+"@\//;

function readModule(relativePath: string): string {
    return readFileSync(path.join(PROJECT_DIR, `${relativePath}.ts`), "utf8");
}

/** next.config.ts is loaded by Next's own transpiler, which knows nothing of tsconfig paths. */
describe("modules loaded by next.config.ts", () => {
    const configModules = [...readFileSync(path.join(PROJECT_DIR, "next.config.ts"), "utf8").matchAll(CONFIG_IMPORT_PATTERN)].map((match) => match[1]);

    it.each(configModules)("%s imports nothing through the @/ alias", (modulePath) => {
        expect(readModule(modulePath)).not.toMatch(ALIAS_IMPORT_PATTERN);
    });
});
