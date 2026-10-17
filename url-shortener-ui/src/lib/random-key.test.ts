import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {
    consumePrefetchedRandomKey,
    peekPrefetchedRandomKey,
    prefetchRandomKey,
    resetRandomKeyPrefetchForTests,
    takeRandomKey,
} from "@/lib/random-key";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const PREFETCHED_KEY_MAX_AGE_MS = 60_000;

function answerWithKeys(...keys: string[]): void {
    for (const key of keys) vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({key}));
}

async function settle(): Promise<void> {
    await vi.waitFor(() => expect(peekPrefetchedRandomKey()).not.toBeNull());
}

describe("random key prefetch", () => {
    beforeEach(() => {
        resetRandomKeyPrefetchForTests();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("holds a prefetched key until it is used", async () => {
        answerWithKeys("abc123");

        prefetchRandomKey();
        await settle();

        expect(peekPrefetchedRandomKey()).toBe("abc123");
        expect(peekPrefetchedRandomKey()).toBe("abc123");
        consumePrefetchedRandomKey("abc123");
        expect(peekPrefetchedRandomKey()).toBeNull();
    });

    it("asks the server only once while a fresh key is held", async () => {
        answerWithKeys("abc123");

        prefetchRandomKey();
        prefetchRandomKey();
        await settle();
        prefetchRandomKey();

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.SHORTLINKS_RANDOM);
    });

    it("hands over a prefetch that is still in flight instead of requesting again", async () => {
        answerWithKeys("abc123");
        prefetchRandomKey();

        await expect(takeRandomKey()).resolves.toBe("abc123");

        expect(fetchWithAuth).toHaveBeenCalledOnce();
        expect(peekPrefetchedRandomKey()).toBeNull();
    });

    it("requests a new key when nothing was prefetched", async () => {
        answerWithKeys("fresh1");

        await expect(takeRandomKey()).resolves.toBe("fresh1");
    });

    it("drops a prefetched key after a minute, since it may have been taken meanwhile", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        answerWithKeys("old111", "new222");
        prefetchRandomKey();
        await settle();

        vi.advanceTimersByTime(PREFETCHED_KEY_MAX_AGE_MS);

        expect(peekPrefetchedRandomKey()).toBeNull();
        await expect(takeRandomKey()).resolves.toBe("new222");
    });
});
