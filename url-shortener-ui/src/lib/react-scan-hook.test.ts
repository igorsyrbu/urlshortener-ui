import fs from "node:fs";
import {describe, expect, it, vi} from "vitest";
import {logger} from "@/lib/logger";
import {getReactScanHook} from "./react-scan-hook";

vi.mock("@/lib/logger");

const HOOK_FILE_SUFFIX = "/react-scan/dist/install-hook.global.js";

describe("React Scan bootstrap hook", () => {
    it("reads the hook resolved from the installed package for development pages", () => {
        vi.stubEnv("NODE_ENV", "development");
        const hookScript = "development observer hook";
        const readFile = vi.spyOn(fs, "readFileSync").mockReturnValue(hookScript);

        expect(getReactScanHook()).toBe(hookScript);
        expect(readFile).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(HOOK_FILE_SUFFIX), "utf8");
        expect(vi.mocked(logger.warn)).not.toHaveBeenCalled();
    });

    it("omits the hook and warns when it cannot be read, so the page still renders", () => {
        vi.stubEnv("NODE_ENV", "development");
        const readFile = vi.spyOn(fs, "readFileSync").mockImplementation(() => {
            throw new Error("ENOENT: no such file or directory");
        });

        expect(getReactScanHook()).toBeUndefined();
        expect(readFile).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(HOOK_FILE_SUFFIX), "utf8");
        expect(vi.mocked(logger.warn)).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining("React Scan"), {reason: "ENOENT: no such file or directory"},
        );
    });

    it.each(["production", "test"])("omits the hook without reading package files in %s", (environment) => {
        vi.stubEnv("NODE_ENV", environment);
        const readFile = vi.spyOn(fs, "readFileSync");

        expect(getReactScanHook()).toBeUndefined();
        expect(readFile).not.toHaveBeenCalled();
    });
});
