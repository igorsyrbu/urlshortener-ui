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

        await import("./instrumentation-client");

        await vi.waitFor(() => expect(vi.mocked(scan)).toHaveBeenCalledExactlyOnceWith(DEVELOPMENT_SCAN_OPTIONS));
    });

    it.each(["production", "test"])("does not start scanning in %s", async (environment) => {
        vi.stubEnv("NODE_ENV", environment);

        await import("./instrumentation-client");
        await import("react-scan");

        expect(vi.mocked(scan)).not.toHaveBeenCalled();
    });
});
