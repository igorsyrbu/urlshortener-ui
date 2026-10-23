import {beforeEach, describe, expect, it, vi} from "vitest";
import {scan} from "react-scan";

vi.mock("react-scan", () => ({scan: vi.fn()}));

describe("development render scanning", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("starts scanning in development without requiring a blob worker", async () => {
        vi.stubEnv("NODE_ENV", "development");

        await import("./instrumentation-client");

        expect(vi.mocked(scan)).toHaveBeenCalledExactlyOnceWith({enabled: true, useOffscreenCanvasWorker: false});
    });

    it.each(["production", "test"])("does not start scanning in %s", async (environment) => {
        vi.stubEnv("NODE_ENV", environment);

        await import("./instrumentation-client");

        expect(vi.mocked(scan)).not.toHaveBeenCalled();
    });
});
