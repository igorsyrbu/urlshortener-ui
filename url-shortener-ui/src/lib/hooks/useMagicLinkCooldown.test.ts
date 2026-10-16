import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MAGIC_LINK_COOLDOWN_INTERVAL_MS, MAGIC_LINK_COOLDOWN_STORAGE_KEY} from "@/lib/constants";
import {useMagicLinkCooldown} from "@/lib/hooks/useMagicLinkCooldown";

const NOW = new Date("2026-10-12T10:00:00Z");
const EMAIL = "ada@example.com";
const OTHER_EMAIL = "grace@example.com";
const COOLDOWN_SECONDS = 30;

function storedCooldowns(): Record<string, number> {
    return JSON.parse(localStorage.getItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY) ?? "{}");
}

function storeCooldown(email: string, secondsFromNow: number): void {
    const existing = storedCooldowns();
    existing[email] = Date.now() + secondsFromNow * 1000;
    localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, JSON.stringify(existing));
}

function advanceSeconds(seconds: number): void {
    act(() => { vi.advanceTimersByTime(seconds * MAGIC_LINK_COOLDOWN_INTERVAL_MS); });
}

describe("useMagicLinkCooldown", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("is inactive when no cooldown was stored", () => {
        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        expect(result.current.isCooldownActive).toBe(false);
        expect(result.current.remainingSeconds).toBe(0);
    });

    it("starts a cooldown and persists its expiry for the email", () => {
        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        act(() => { result.current.startCooldown(COOLDOWN_SECONDS); });

        expect(result.current.isCooldownActive).toBe(true);
        expect(result.current.remainingSeconds).toBe(COOLDOWN_SECONDS);
        expect(storedCooldowns()[EMAIL]).toBe(NOW.getTime() + COOLDOWN_SECONDS * 1000);
    });

    it("counts down every second", () => {
        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));
        act(() => { result.current.startCooldown(COOLDOWN_SECONDS); });

        advanceSeconds(5);

        expect(result.current.remainingSeconds).toBe(COOLDOWN_SECONDS - 5);
    });

    it("ends and removes the stored cooldown when the time is up", () => {
        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));
        act(() => { result.current.startCooldown(COOLDOWN_SECONDS); });

        advanceSeconds(COOLDOWN_SECONDS);

        expect(result.current.isCooldownActive).toBe(false);
        expect(result.current.remainingSeconds).toBe(0);
        expect(storedCooldowns()[EMAIL]).toBeUndefined();
    });

    it("keeps other emails' cooldowns when one ends", () => {
        storeCooldown(OTHER_EMAIL, 600);
        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));
        act(() => { result.current.startCooldown(COOLDOWN_SECONDS); });

        advanceSeconds(COOLDOWN_SECONDS);

        expect(storedCooldowns()[OTHER_EMAIL]).toBeDefined();
    });

    it("resumes a cooldown stored by an earlier session", () => {
        storeCooldown(EMAIL, 12);

        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        expect(result.current.isCooldownActive).toBe(true);
        expect(result.current.remainingSeconds).toBe(12);
    });

    it("rounds a partial second up so the user never retries too early", () => {
        localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, JSON.stringify({[EMAIL]: NOW.getTime() + 1500}));

        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        expect(result.current.remainingSeconds).toBe(2);
    });

    it("ignores and purges expired cooldowns", () => {
        storeCooldown(EMAIL, -10);

        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        expect(result.current.isCooldownActive).toBe(false);
        expect(storedCooldowns()).toEqual({});
    });

    it("tracks cooldowns separately for each email", () => {
        storeCooldown(OTHER_EMAIL, 20);
        const {result, rerender} = renderHook(({email}) => useMagicLinkCooldown(email), {initialProps: {email: EMAIL}});
        expect(result.current.isCooldownActive).toBe(false);

        rerender({email: OTHER_EMAIL});

        expect(result.current.remainingSeconds).toBe(20);
    });

    it("ignores surrounding whitespace in the email", () => {
        storeCooldown(EMAIL, 20);

        const {result} = renderHook(() => useMagicLinkCooldown(`  ${EMAIL} `));

        expect(result.current.remainingSeconds).toBe(20);
    });

    it("does not start a cooldown for a blank email", () => {
        const {result} = renderHook(() => useMagicLinkCooldown("   "));

        act(() => { result.current.startCooldown(COOLDOWN_SECONDS); });

        expect(result.current.isCooldownActive).toBe(false);
        expect(localStorage.getItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY)).toBeNull();
    });

    it("treats corrupt stored data as no cooldown", () => {
        localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, "{not json");

        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        expect(result.current.isCooldownActive).toBe(false);
    });

    it("drops non-numeric stored expiries", () => {
        localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, JSON.stringify({[EMAIL]: "soon"}));

        const {result} = renderHook(() => useMagicLinkCooldown(EMAIL));

        expect(result.current.isCooldownActive).toBe(false);
        expect(storedCooldowns()).toEqual({});
    });

    it("stops ticking after unmount", () => {
        const {result, unmount} = renderHook(() => useMagicLinkCooldown(EMAIL));
        act(() => { result.current.startCooldown(COOLDOWN_SECONDS); });

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
