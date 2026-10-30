"use client";

import {useEffect, useSyncExternalStore} from "react";
import {useRouter} from "next/navigation";
import {useQuery} from "@tanstack/react-query";
import {ApiError} from "@/lib/api-request";
import {HTTP_FORBIDDEN, HTTP_UNAUTHORIZED} from "@/lib/http-status";
import {ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {currentUserQueryOptions} from "@/lib/query/user-queries";
import {clearSessionHint, hasSessionHint, setSessionHint} from "@/lib/session-hint";

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

const PROFILE_LOG_ERROR = "Failed to load the current user";

function subscribeToNothing(): () => void {
    return () => undefined;
}

function hasNoSessionHintOnServer(): boolean {
    return false;
}

function isSessionRejected(error: Error | null): boolean {
    return error instanceof ApiError && (error.status === HTTP_UNAUTHORIZED || error.status === HTTP_FORBIDDEN);
}

function resolvePhase(hasUser: boolean, hasHint: boolean, error: Error | null, isRetrying: boolean): SessionPhase {
    if (hasUser) return "ready";
    if (isSessionRejected(error)) return "checking";
    if (hasHint) return "ready";
    return error && !isRetrying ? "unavailable" : "checking";
}

/**
 * Loads the signed-in user (`currentUserQueryOptions`) for the dashboard. With a session hint the shell and page
 * render at once and the profile loads alongside the page's own requests (they share one token refresh); without one
 * the page waits for the check, so a signed-out visitor never sees the dashboard.
 */
export function useSessionBootstrap(): SessionBootstrap {
    const router = useRouter();
    // The server cannot read localStorage, so the prerendered HTML is the unhinted state and the hint applies on hydration.
    const hasHint = useSyncExternalStore(subscribeToNothing, hasSessionHint, hasNoSessionHintOnServer);
    const {data: user, error, isFetching, refetch} = useQuery(currentUserQueryOptions);

    useEffect(() => {
        if (user) setSessionHint();
    }, [user]);

    useEffect(() => {
        if (!error) return;
        if (isSessionRejected(error)) {
            clearSessionHint();
            router.replace(ROUTES.LOGIN);
            return;
        }
        logger.error(PROFILE_LOG_ERROR, error);
    }, [error, router]);

    const handleRetry = (): void => {
        void refetch();
    };

    return {phase: resolvePhase(user !== undefined, hasHint, error, isFetching), handleRetry};
}
