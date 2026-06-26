"use client";

import {useCallback, useEffect, useState} from "react";
import {MAGIC_LINK_COOLDOWN_INTERVAL_MS, MAGIC_LINK_COOLDOWN_STORAGE_KEY} from "@/lib/constants";

interface UseMagicLinkCooldownResult {
    remainingSeconds: number;
    isCooldownActive: boolean;
    startCooldown: (retryAfterSeconds: number) => void;
    clearCooldown: () => void;
}

type CooldownStore = Record<string, number>;

function readCooldownStore(): CooldownStore {
    if (typeof window === "undefined") return {};

    try {
        const raw = localStorage.getItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY);
        if (!raw) return {};

        const store: CooldownStore = JSON.parse(raw);
        if (typeof store !== "object" || store === null) return {};

        const now = Date.now();
        let changed = false;

        const cleaned: CooldownStore = {};
        for (const [key, expiry] of Object.entries(store)) {
            if (typeof expiry !== "number" || expiry <= now) {
                changed = true;
                continue;
            }
            cleaned[key] = expiry;
        }

        if (changed) {
            localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, JSON.stringify(cleaned));
        }

        return cleaned;
    } catch {
        return {};
    }
}

function writeCooldownStore(store: CooldownStore): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(MAGIC_LINK_COOLDOWN_STORAGE_KEY, JSON.stringify(store));
}

function getRemainingSecondsForEmail(email: string): number {
    if (!email) return 0;
    const store = readCooldownStore();
    const expiry = store[email];
    if (!expiry) return 0;
    const remaining = Math.ceil((expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
}

export function useMagicLinkCooldown(email: string): UseMagicLinkCooldownResult {
    const trimmedEmail = email.trim();

    const [remainingSeconds, setRemainingSeconds] = useState(0);

    const clearCooldown = useCallback(() => {
        if (!trimmedEmail) return;
        setRemainingSeconds(0);
        if (typeof window === "undefined") return;
        const store = readCooldownStore();
        delete store[trimmedEmail];
        writeCooldownStore(store);
    }, [trimmedEmail]);

    const startCooldown = useCallback((retryAfterSeconds: number) => {
        if (!trimmedEmail) return;
        const expiry = Date.now() + retryAfterSeconds * 1000;
        if (typeof window !== "undefined") {
            const store = readCooldownStore();
            store[trimmedEmail] = expiry;
            writeCooldownStore(store);
        }
        setRemainingSeconds(retryAfterSeconds);
    }, [trimmedEmail]);

    useEffect(() => {
        setRemainingSeconds(getRemainingSecondsForEmail(trimmedEmail));
    }, [trimmedEmail]);

    useEffect(() => {
        if (remainingSeconds <= 0) return;

        const intervalId = setInterval(() => {
            const remaining = getRemainingSecondsForEmail(trimmedEmail);
            if (remaining <= 0) {
                clearCooldown();
            } else {
                setRemainingSeconds(remaining);
            }
        }, MAGIC_LINK_COOLDOWN_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [remainingSeconds, trimmedEmail, clearCooldown]);

    return {
        remainingSeconds,
        isCooldownActive: remainingSeconds > 0,
        startCooldown,
        clearCooldown,
    };
}
