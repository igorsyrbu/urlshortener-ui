"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {ApiError} from "@/lib/api-request";
import {ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {UserSession} from "@/lib/session-utils";
import {useAuthStore} from "@/lib/store/auth";
import {fetchUserSessions, terminateCurrentSession, terminateOtherSessions, terminateSession} from "@/lib/user-api";

/** `pendingSessionAction` while "log out all other sessions" runs; otherwise it holds the session id. */
export const OTHER_SESSIONS_ACTION = "other";

type SessionDeleteOutcome = "deleted" | "rejected" | "failed";

interface UseUserSessionsResult {
    currentSession: UserSession | undefined;
    otherSessions: UserSession[];
    isLoadingSessions: boolean;
    pendingSessionAction: string | null;
    logoutSession: (id: string, isCurrent: boolean) => Promise<void>;
    logoutOtherSessions: () => Promise<void>;
}

function currentSessionFirst(first: UserSession, second: UserSession): number {
    if (first.current === second.current) return 0;
    return first.current ? -1 : 1;
}

async function loadSessions(): Promise<UserSession[] | null> {
    try {
        const sessions = await fetchUserSessions();
        return sessions.sort(currentSessionFirst);
    } catch (error) {
        if (!(error instanceof ApiError)) logger.error("Failed to load sessions", error);
        return null;
    }
}

/** `rejected` when the server refused, `failed` (logged) when it could not be reached. */
async function deleteSessions(terminate: () => Promise<void>, failureLogMessage: string): Promise<SessionDeleteOutcome> {
    try {
        await terminate();
        return "deleted";
    } catch (error) {
        if (error instanceof ApiError) return "rejected";
        logger.error(failureLogMessage, error);
        return "failed";
    }
}

export function useUserSessions(): UseUserSessionsResult {
    const router = useRouter();
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [pendingSessionAction, setPendingSessionAction] = useState<string | null>(null);
    const fetched = useRef(false);

    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;

        void loadSessions().then((loadedSessions) => {
            if (loadedSessions) setSessions(loadedSessions);
            setIsLoadingSessions(false);
        });
    }, []);

    const logoutSession = async (id: string, isCurrent: boolean): Promise<void> => {
        setPendingSessionAction(id);
        const terminate = isCurrent ? terminateCurrentSession : () => terminateSession(id);
        const outcome = await deleteSessions(terminate, "Error terminating session");
        setPendingSessionAction(null);
        if (outcome === "rejected") {
            toast.error("Failed to terminate session");
            return;
        }
        if (outcome === "failed") {
            toast.error("An unexpected error occurred while terminating session");
            return;
        }
        if (isCurrent) {
            useAuthStore.getState().logout();
            router.replace(ROUTES.LOGIN);
            return;
        }
        setSessions((prev) => prev.filter((session) => session.id !== id));
        toast.success("Session terminated successfully");
    };

    const logoutOtherSessions = async (): Promise<void> => {
        setPendingSessionAction(OTHER_SESSIONS_ACTION);
        const outcome = await deleteSessions(terminateOtherSessions, "Error terminating other sessions");
        setPendingSessionAction(null);
        if (outcome === "rejected") {
            toast.error("Failed to terminate other sessions");
            return;
        }
        if (outcome === "failed") {
            toast.error("An unexpected error occurred while terminating other sessions");
            return;
        }
        setSessions((prev) => prev.filter((session) => session.current));
        toast.success("Successfully logged out of all other devices");
    };

    return {
        currentSession: sessions.find((session) => session.current),
        otherSessions: sessions.filter((session) => !session.current),
        isLoadingSessions,
        pendingSessionAction,
        logoutSession,
        logoutOtherSessions,
    };
}
