import {fetchWithAuth} from "@/lib/api";
import type {RandomKeyResponse} from "@/lib/api-types";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";

/** A prefetched key may have been taken by someone else since; after this it is fetched again. */
const PREFETCHED_KEY_MAX_AGE_MS = 60_000;
const RANDOM_KEY_LOG_ERROR = "Error fetching random key";

interface PrefetchedKey {
    request: Promise<string | null>;
    key: string | null;
    fetchedAt: number;
}

let prefetched: PrefetchedKey | null = null;

/** The server-generated random key, or `null` (logged) when it could not be fetched. */
export async function requestRandomKey(): Promise<string | null> {
    try {
        const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS_RANDOM);
        if (!res.ok) {
            logger.error(RANDOM_KEY_LOG_ERROR, new Error(`Failed to fetch random key: ${res.status}`));
            return null;
        }
        const data: RandomKeyResponse = await res.json();
        return data.key;
    } catch (err) {
        logger.error(RANDOM_KEY_LOG_ERROR, err);
        return null;
    }
}

function isFresh(entry: PrefetchedKey): boolean {
    return Date.now() - entry.fetchedAt < PREFETCHED_KEY_MAX_AGE_MS;
}

/** Fetches one key ahead of the create form (on intent to create); a no-op while a fresh one is held. */
export function prefetchRandomKey(): void {
    if (prefetched !== null && isFresh(prefetched)) return;
    const entry: PrefetchedKey = {request: requestRandomKey(), key: null, fetchedAt: Date.now()};
    prefetched = entry;
    void entry.request.then((key) => {
        entry.key = key;
    });
}

/** The prefetched key if it has already arrived and is fresh; does not use it up. */
export function peekPrefetchedRandomKey(): string | null {
    return prefetched !== null && isFresh(prefetched) ? prefetched.key : null;
}

/** Marks a peeked key as used, so the next form gets a different one. */
export function consumePrefetchedRandomKey(key: string): void {
    if (prefetched?.key === key) prefetched = null;
}

/** A key for the form: the prefetched one (even while still in flight), else a new request. */
export function takeRandomKey(): Promise<string | null> {
    if (prefetched !== null && isFresh(prefetched)) {
        const {request} = prefetched;
        prefetched = null;
        return request;
    }
    return requestRandomKey();
}

export function resetRandomKeyPrefetchForTests(): void {
    prefetched = null;
}
