"use client";

import {useEffect, useState, useSyncExternalStore} from "react";
import {useRouter} from "next/navigation";
import {fetchWithAuth} from "@/lib/api";
import {HTTP_FORBIDDEN, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {clearSessionHint, hasSessionHint, setSessionHint} from "@/lib/session-hint";
import {useAuthStore, type UserProfile} from "@/lib/store/auth";

/**
 * `ready`: render the shell and the page (the profile may still be loading). `checking`: the session is unconfirmed
 * and there is no hint that it exists, or it was rejected and the login redirect is under way. `unavailable`: the
 * server could not confirm an unhinted session; offer a retry instead of signing the user out.
 */
export type SessionPhase = "ready" | "checking" | "unavailable";

export interface SessionBootstrap {
    phase: SessionPhase;
    handleRetry: () => void;
}

type ProfileResult = {kind: "loaded"; user: UserProfile} | {kind: "rejected"} | {kind: "unavailable"};

const PROFILE_LOG_ERROR = "Failed to load the current user";

function subscribeToNothing(): () => void {
    return () => undefined;
}

function hasNoSessionHintOnServer(): boolean {
    return false;
}

async function loadCurrentUser(): Promise<ProfileResult> {
    try {
        const response = await fetchWithAuth(API_ENDPOINTS.USERS_ME);
        if (response.ok) return {kind: "loaded", user: await response.json()};
        const isRejected = response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN;
        return isRejected ? {kind: "rejected"} : {kind: "unavailable"};
    } catch (error) {
        logger.error(PROFILE_LOG_ERROR, error);
        return {kind: "unavailable"};
    }
}

function resolvePhase(hasUser: boolean, hasHint: boolean, result: ProfileResult | null): SessionPhase {
    if (hasUser) return "ready";
    if (result?.kind === "rejected") return "checking";
    if (hasHint) return "ready";
    return result?.kind === "unavailable" ? "unavailable" : "checking";
}

/**
 * Loads the signed-in user for the dashboard. With a session hint the shell and page render at once and the profile
 * loads alongside the page's own requests (they share one token refresh); without one the page waits for the check,
 * so a signed-out visitor never sees the dashboard.
 */
export function useSessionBootstrap(): SessionBootstrap {
    const router = useRouter();
    const hasUser = useAuthStore((state) => state.user !== null);
    // The server cannot read localStorage, so the prerendered HTML is the unhinted state and the hint applies on hydration.
    const hasHint = useSyncExternalStore(subscribeToNothing, hasSessionHint, hasNoSessionHintOnServer);
    const [result, setResult] = useState<ProfileResult | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (useAuthStore.getState().user !== null) return;
        let isCurrent = true;
        void loadCurrentUser().then((loaded) => {
            if (!isCurrent) return;
            setResult(loaded);
            if (loaded.kind === "loaded") {
                useAuthStore.getState().setUser(loaded.user);
                setSessionHint();
            } else if (loaded.kind === "rejected") {
                clearSessionHint();
                router.replace(ROUTES.LOGIN);
            }
        });
        return () => {
            isCurrent = false;
        };
    }, [attempt, router]);

    function handleRetry(): void {
        setResult(null);
        setAttempt((count) => count + 1);
    }

    return {phase: resolvePhase(hasUser, hasHint, result), handleRetry};
}
