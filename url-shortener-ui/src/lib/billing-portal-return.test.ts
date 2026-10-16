import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
    consumePortalReturn,
    markPortalOpened,
    PORTAL_RETURN_FALLBACK_TTL_MS,
    PORTAL_RETURN_STORAGE_KEY,
} from "@/lib/billing-portal-return";

const PORTAL_TTL_SECONDS = 60 * 60;
const MILLISECONDS_PER_SECOND = 1000;
const PORTAL_TTL_MS = PORTAL_TTL_SECONDS * MILLISECONDS_PER_SECOND;
const INITIAL_TIME_MS = Date.parse("2026-10-13T12:00:00Z");

function throwStorageUnavailable(): never {
    throw new Error("Storage unavailable");
}

describe("portal return flag", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(INITIAL_TIME_MS);
    });
    afterEach(() => vi.useRealTimers());

    it("consumes a live portal visit once", () => {
        markPortalOpened(PORTAL_TTL_SECONDS);

        expect(consumePortalReturn()).toBe(true);
        expect(consumePortalReturn()).toBe(false);
    });

    it("records the countdown relative to the browser's current time", () => {
        markPortalOpened(PORTAL_TTL_SECONDS);

        expect(localStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).toBe(
            JSON.stringify({expiresAtMs: INITIAL_TIME_MS + PORTAL_TTL_MS}),
        );
    });

    it("refreshes just before the reported countdown expires", () => {
        markPortalOpened(PORTAL_TTL_SECONDS);

        vi.setSystemTime(INITIAL_TIME_MS + PORTAL_TTL_MS - 1);

        expect(consumePortalReturn()).toBe(true);
    });

    it("removes a flag at the exact expiry boundary without refreshing", () => {
        markPortalOpened(PORTAL_TTL_SECONDS);

        vi.setSystemTime(INITIAL_TIME_MS + PORTAL_TTL_MS);

        expect(consumePortalReturn()).toBe(false);
        expect(localStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).toBeNull();
    });

    it("does not replace an expired zero countdown with a fallback", () => {
        markPortalOpened(0);

        expect(consumePortalReturn()).toBe(false);
    });

    it.each([null, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE])(
        "falls back to a short TTL for missing or invalid lifetime %s",
        (expiresInSeconds) => {
            markPortalOpened(expiresInSeconds);

            vi.setSystemTime(INITIAL_TIME_MS + PORTAL_RETURN_FALLBACK_TTL_MS - 1);

            expect(consumePortalReturn()).toBe(true);
        },
    );

    it("expires the fallback at its exact boundary", () => {
        markPortalOpened(null);

        vi.setSystemTime(INITIAL_TIME_MS + PORTAL_RETURN_FALLBACK_TTL_MS);

        expect(consumePortalReturn()).toBe(false);
    });

    it.each(["invalid-json", "null", "{}", '{"expiresAtMs":"tomorrow"}', '{"expiresAtMs":1e400}'])(
        "removes corrupt storage without refreshing: %s",
        (entry) => {
            localStorage.setItem(PORTAL_RETURN_STORAGE_KEY, entry);

            expect(consumePortalReturn()).toBe(false);
            expect(localStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).toBeNull();
        },
    );

    it("ignores a missing flag", () => {
        expect(consumePortalReturn()).toBe(false);
    });

    it("does not interrupt portal opening when storage writes fail", () => {
        vi.spyOn(localStorage, "setItem").mockImplementation(throwStorageUnavailable);

        expect(() => markPortalOpened(PORTAL_TTL_SECONDS)).not.toThrow();
    });

    it("skips refresh when storage reads fail", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(throwStorageUnavailable);

        expect(consumePortalReturn()).toBe(false);
    });

    it("skips refresh when storage removal fails", () => {
        markPortalOpened(PORTAL_TTL_SECONDS);
        vi.spyOn(localStorage, "removeItem").mockImplementation(throwStorageUnavailable);

        expect(consumePortalReturn()).toBe(false);
    });
});
