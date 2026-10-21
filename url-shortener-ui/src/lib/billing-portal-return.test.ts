import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
    clearPortalReturn,
    markPortalOpened,
    peekPortalReturn,
    PORTAL_RETURN_MAX_AGE_MS,
    PORTAL_RETURN_STORAGE_KEY,
} from "@/lib/billing-portal-return";

const INITIAL_TIME_MS = Date.parse("2026-10-13T12:00:00Z");
const ONE_HOUR_MS = 60 * 60 * 1000;

function throwStorageUnavailable(): never {
    throw new Error("Storage unavailable");
}

describe("portal return flag", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(INITIAL_TIME_MS);
    });

    afterEach(() => {
        vi.useRealTimers();
        sessionStorage.clear();
        localStorage.clear();
    });

    it("stays set until it is cleared, so a failed refresh can try again", () => {
        markPortalOpened();

        expect(peekPortalReturn()).toBe(true);
        expect(peekPortalReturn()).toBe(true);
        clearPortalReturn();
        expect(peekPortalReturn()).toBe(false);
    });

    it("is kept per tab, not shared through localStorage", () => {
        markPortalOpened();

        expect(sessionStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).toBe(JSON.stringify({openedAtMs: INITIAL_TIME_MS}));
        expect(localStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).toBeNull();
    });

    it("still refreshes after the portal session itself has expired", () => {
        markPortalOpened();

        vi.setSystemTime(INITIAL_TIME_MS + ONE_HOUR_MS * 2);

        expect(peekPortalReturn()).toBe(true);
    });

    it("lapses after a day", () => {
        markPortalOpened();

        vi.setSystemTime(INITIAL_TIME_MS + PORTAL_RETURN_MAX_AGE_MS);

        expect(peekPortalReturn()).toBe(false);
    });

    it.each(["invalid-json", "null", "{}", '{"openedAtMs":"today"}', '{"openedAtMs":1e400}'])("ignores corrupt storage: %s", (entry) => {
        sessionStorage.setItem(PORTAL_RETURN_STORAGE_KEY, entry);

        expect(peekPortalReturn()).toBe(false);
    });

    it("ignores a missing flag", () => {
        expect(peekPortalReturn()).toBe(false);
    });

    it("does not interrupt portal opening when storage writes fail", () => {
        const setItem = vi.spyOn(sessionStorage, "setItem").mockImplementation(throwStorageUnavailable);

        expect(() => markPortalOpened()).not.toThrow();
        expect(setItem).toHaveBeenCalled();
    });

    it("skips the refresh when storage reads fail", () => {
        vi.spyOn(sessionStorage, "getItem").mockImplementation(throwStorageUnavailable);

        expect(peekPortalReturn()).toBe(false);
    });

    it("does not throw when clearing fails", () => {
        vi.spyOn(sessionStorage, "removeItem").mockImplementation(throwStorageUnavailable);

        expect(() => clearPortalReturn()).not.toThrow();
    });
});
