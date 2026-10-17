import {describe, expect, it, vi} from "vitest";
import {logger} from "@/lib/logger";
import {clearSessionHint, hasSessionHint, SESSION_HINT_STORAGE_KEY, setSessionHint} from "@/lib/session-hint";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

describe("session hint", () => {
    it("is absent in a fresh browser", () => {
        expect(hasSessionHint()).toBe(false);
    });

    it("is present after being set and absent after being cleared", () => {
        setSessionHint();
        expect(hasSessionHint()).toBe(true);

        clearSessionHint();

        expect(hasSessionHint()).toBe(false);
    });

    it("ignores a foreign value under its key", () => {
        localStorage.setItem(SESSION_HINT_STORAGE_KEY, "yes");

        expect(hasSessionHint()).toBe(false);
    });

    it("treats unreadable storage as no hint and logs the failure", () => {
        const storageError = new DOMException("blocked", "SecurityError");
        vi.spyOn(localStorage, "getItem").mockImplementation(() => {
            throw storageError;
        });

        expect(hasSessionHint()).toBe(false);
        expect(logger.error).toHaveBeenCalledWith("Failed to read the session hint", storageError);
    });

    it("logs instead of throwing when storage rejects a write", () => {
        vi.spyOn(localStorage, "setItem").mockImplementation(() => {
            throw new DOMException("full", "QuotaExceededError");
        });

        expect(() => setSessionHint()).not.toThrow();
        expect(logger.error).toHaveBeenCalledOnce();
    });
});
