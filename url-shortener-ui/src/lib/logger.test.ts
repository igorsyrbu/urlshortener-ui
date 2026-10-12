import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const FIXED_TIME = new Date("2026-01-02T03:04:05.000Z");
const TIMESTAMP = FIXED_TIME.toISOString();

type Logger = typeof import("@/lib/logger")["logger"];

interface ConsoleSpies {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
}

function spyOnConsole(): ConsoleSpies {
    return {
        debug: vi.spyOn(console, "debug").mockImplementation(() => undefined),
        info: vi.spyOn(console, "info").mockImplementation(() => undefined),
        warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
        error: vi.spyOn(console, "error").mockImplementation(() => undefined),
    };
}

async function loadLogger(nodeEnv: string): Promise<Logger> {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.resetModules();
    return (await import("@/lib/logger")).logger;
}

describe("logger", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_TIME);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("in development", () => {
        it("prints every level with a prefix, timestamp and context", async () => {
            const logger = await loadLogger("development");
            const spies = spyOnConsole();
            const context = {linkId: 7};

            logger.debug("debug message", context);
            logger.info("info message", context);
            logger.warn("warn message", context);
            logger.error("error message", new Error("boom"), context);

            expect(spies.debug).toHaveBeenCalledExactlyOnceWith(`[DEBUG] ${TIMESTAMP} debug message`, context);
            expect(spies.info).toHaveBeenCalledExactlyOnceWith(`[INFO] ${TIMESTAMP} info message`, context);
            expect(spies.warn).toHaveBeenCalledExactlyOnceWith(`[WARN] ${TIMESTAMP} warn message`, context);
            expect(spies.error).toHaveBeenCalledExactlyOnceWith(
                `[ERROR] ${TIMESTAMP} error message`,
                expect.objectContaining({name: "Error", message: "boom"}),
                context,
            );
        });

        it("prints an empty placeholder when no context is given", async () => {
            const logger = await loadLogger("development");
            const spies = spyOnConsole();

            logger.debug("a");
            logger.info("b");
            logger.warn("c");
            logger.error("d");

            expect(spies.debug).toHaveBeenCalledWith(expect.any(String), "");
            expect(spies.info).toHaveBeenCalledWith(expect.any(String), "");
            expect(spies.warn).toHaveBeenCalledWith(expect.any(String), "");
            expect(spies.error).toHaveBeenCalledWith(expect.any(String), undefined, "");
        });

        it("serializes an Error with its name, message and stack", async () => {
            const logger = await loadLogger("development");
            const spies = spyOnConsole();
            const error = new TypeError("bad input");

            logger.error("failed", error);

            expect(spies.error).toHaveBeenCalledWith(expect.any(String), {
                name: "TypeError",
                message: "bad input",
                stack: error.stack,
            }, "");
        });

        it.each([
            ["a string", "plain failure", "plain failure"],
            ["a number", 404, "404"],
            ["an object", {code: 1}, "[object Object]"],
        ])("serializes %s thrown as a non-Error value", async (_name, thrown, expectedMessage) => {
            const logger = await loadLogger("development");
            const spies = spyOnConsole();

            logger.error("failed", thrown);

            expect(spies.error).toHaveBeenCalledWith(
                expect.any(String), {name: "UnknownError", message: expectedMessage}, "",
            );
        });
    });

    describe("in production", () => {
        it("suppresses debug and info output", async () => {
            const logger = await loadLogger("production");
            const spies = spyOnConsole();

            logger.debug("hidden");
            logger.info("hidden");

            expect(spies.debug).not.toHaveBeenCalled();
            expect(spies.info).not.toHaveBeenCalled();
        });

        it("still prints warnings and errors", async () => {
            const logger = await loadLogger("production");
            const spies = spyOnConsole();

            logger.warn("careful");
            logger.error("broken", new Error("boom"));

            expect(spies.warn).toHaveBeenCalledOnce();
            expect(spies.error).toHaveBeenCalledOnce();
        });
    });
});
