import {beforeEach, describe, expect, it, vi} from "vitest";
import {scan} from "react-scan";

vi.mock("react-scan", () => ({scan: vi.fn()}));

const DEVELOPMENT_SCAN_OPTIONS = {enabled: true, useOffscreenCanvasWorker: false};

describe("development render scanning", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("starts scanning in development without requiring a blob worker", async () => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("NEXT_PUBLIC_ENABLE_REACT_SCAN", "true");

        await import("./instrumentation-client");

        await vi.waitFor(() => expect(vi.mocked(scan)).toHaveBeenCalledExactlyOnceWith(DEVELOPMENT_SCAN_OPTIONS));
    });

    it.each(["production", "test"])("does not start scanning in %s even when the flag is on", async (environment) => {
        vi.stubEnv("NODE_ENV", environment);
        vi.stubEnv("NEXT_PUBLIC_ENABLE_REACT_SCAN", "true");

        await import("./instrumentation-client");
        await import("react-scan");

        expect(vi.mocked(scan)).not.toHaveBeenCalled();
    });

    it.each([undefined, "false", "1"])("does not start scanning in development when the flag is %s", async (flag) => {
        vi.stubEnv("NODE_ENV", "development");
        vi.stubEnv("NEXT_PUBLIC_ENABLE_REACT_SCAN", flag);

        await import("./instrumentation-client");
        await import("react-scan");

        expect(vi.mocked(scan)).not.toHaveBeenCalled();
    });
});
