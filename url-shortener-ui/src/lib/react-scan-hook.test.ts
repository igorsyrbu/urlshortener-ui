import fs from "node:fs";
import {describe, expect, it, vi} from "vitest";
import {getReactScanHook} from "./react-scan-hook";

describe("React Scan bootstrap hook", () => {
    it("reads the installed hook for development pages", () => {
        vi.stubEnv("NODE_ENV", "development");
        const hookScript = "development observer hook";
        const readFile = vi.spyOn(fs, "readFileSync").mockReturnValue(hookScript);

        expect(getReactScanHook()).toBe(hookScript);
        expect(readFile).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining("/react-scan/dist/install-hook.global.js"), "utf8",
        );
    });

    it.each(["production", "test"])("omits the hook without reading package files in %s", (environment) => {
        vi.stubEnv("NODE_ENV", environment);
        const readFile = vi.spyOn(fs, "readFileSync");

        expect(getReactScanHook()).toBeUndefined();
        expect(readFile).not.toHaveBeenCalled();
    });
});
