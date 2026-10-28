"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {UserSession} from "@/lib/session-utils";
import {useAuthStore} from "@/lib/store/auth";

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
        const res = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS);
        if (!res.ok) return null;
        const sessions: UserSession[] = await res.json();
        return sessions.sort(currentSessionFirst);
    } catch (error) {
        logger.error("Failed to load sessions", error);
        return null;
    }
}

async function deleteSessions(endpoint: string, failureLogMessage: string): Promise<SessionDeleteOutcome> {
    try {
        const res = await fetchWithAuth(endpoint, {method: "DELETE"});
        return res.ok ? "deleted" : "rejected";
    } catch (error) {
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
        const endpoint = isCurrent ? API_ENDPOINTS.USERS_SESSIONS_CURRENT : API_ENDPOINTS.USERS_SESSION(id);
        const outcome = await deleteSessions(endpoint, "Error terminating session");
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
        const outcome = await deleteSessions(API_ENDPOINTS.USERS_SESSIONS_OTHER, "Error terminating other sessions");
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
