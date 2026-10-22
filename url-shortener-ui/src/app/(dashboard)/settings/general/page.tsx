"use client";

import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import dynamic from "next/dynamic";
import {toast} from "sonner";
import {fetchWithAuth} from "@/lib/api";
import {useAuthStore} from "@/lib/store/auth";
import {getJwtTTL} from "@/lib/utils";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {UserSession} from "@/lib/session-utils";
import {SETTINGS_SECTION_LIST_CLASS, SettingsSection} from "@/components/settings/SettingsSection";
import {ProfileCard} from "@/components/settings/ProfileCard";
import {AppearanceCard} from "@/components/settings/AppearanceCard";
import {ThemeCard} from "@/components/settings/ThemeCard";
import {PreferencesCard} from "@/components/settings/PreferencesCard";
import {ShortcutsCard} from "@/components/settings/ShortcutsCard";
import {CurrentSessionCard} from "@/components/settings/CurrentSessionCard";
import {OtherSessionsList} from "@/components/settings/OtherSessionsList";
import {DangerZoneCard} from "@/components/settings/DangerZoneCard";
import type {LogoutTarget} from "@/components/settings/SessionLogoutDialog";
import {logger} from "@/lib/logger";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";
import {SETTINGS_SECTION_COPY} from "@/lib/settings-constants";

const SessionLogoutDialog = dynamic(
    () => import("@/components/settings/SessionLogoutDialog").then((dialogModule) => dialogModule.SessionLogoutDialog),
    {ssr: false},
);

type SessionDeleteOutcome = "deleted" | "rejected" | "failed";

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

export default function GeneralSettingsPage() {
    const router = useRouter();
    const accessToken = useAuthStore((state) => state.accessToken);

    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);
    const [logoutTarget, setLogoutTarget] = useState<LogoutTarget>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const jwtTTL = accessToken ? getJwtTTL(accessToken) : null;
    const hasOpenedLogoutDialog = useHasBeenOpened(logoutTarget !== null);

    const fetched = useRef(false);

    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;

        void loadSessions().then((loadedSessions) => {
            if (loadedSessions) setSessions(loadedSessions);
            setIsLoadingSessions(false);
        });
    }, []);

    const handleLogoutSession = async (id: string, isCurrent: boolean = false) => {
        setSessionActionLoading(id);
        const endpoint = isCurrent ? API_ENDPOINTS.USERS_SESSIONS_CURRENT : `/users/sessions/${id}`;
        const outcome = await deleteSessions(endpoint, "Error terminating session");
        setSessionActionLoading(null);
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
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Session terminated successfully");
    };

    const handleLogoutOther = async () => {
        setSessionActionLoading("other");
        const outcome = await deleteSessions(API_ENDPOINTS.USERS_SESSIONS_OTHER, "Error terminating other sessions");
        setSessionActionLoading(null);
        if (outcome === "rejected") {
            toast.error("Failed to terminate other sessions");
            return;
        }
        if (outcome === "failed") {
            toast.error("An unexpected error occurred while terminating other sessions");
            return;
        }
        setSessions((prev) => prev.filter((s) => s.current));
        toast.success("Successfully logged out of all other devices");
    };

    const handleLogoutConfirm = () => {
        if (logoutTarget?.type === "single") {
            handleLogoutSession(logoutTarget.id, logoutTarget.isCurrent);
        } else if (logoutTarget?.type === "other") {
            handleLogoutOther();
        }
        setLogoutTarget(null);
    };

    const currentSession = sessions.find((s) => s.current);
    const otherSessions = sessions.filter((s) => !s.current);

    const handleLogoutCurrentSession = () => {
        if (!currentSession) return;
        setLogoutTarget({type: "single", id: currentSession.id, isCurrent: true});
    };

    return (
        <div className={SETTINGS_SECTION_LIST_CLASS}>
            <SettingsSection {...SETTINGS_SECTION_COPY.PROFILE}>
                <ProfileCard/>
            </SettingsSection>

            <SettingsSection {...SETTINGS_SECTION_COPY.APPEARANCE}>
                <AppearanceCard/>
                <ThemeCard/>
            </SettingsSection>

            <SettingsSection {...SETTINGS_SECTION_COPY.PREFERENCES}>
                <PreferencesCard/>
                <div className="hidden sm:block">
                    <ShortcutsCard/>
                </div>
            </SettingsSection>

            <SettingsSection {...SETTINGS_SECTION_COPY.SESSIONS}>
                <CurrentSessionCard
                    session={currentSession}
                    isLoading={isLoadingSessions}
                    hasOtherSessions={otherSessions.length > 0}
                    isActionDisabled={sessionActionLoading !== null}
                    isLoggingOut={sessionActionLoading === currentSession?.id}
                    isTerminatingOther={sessionActionLoading === "other"}
                    onLogout={handleLogoutCurrentSession}
                    onTerminateOther={() => setLogoutTarget({type: "other"})}
                />
                <OtherSessionsList
                    sessions={otherSessions}
                    isLoading={isLoadingSessions}
                    sessionActionLoading={sessionActionLoading}
                    onLogoutSession={(id) => setLogoutTarget({type: "single", id, isCurrent: false})}
                />
            </SettingsSection>

            <SettingsSection {...SETTINGS_SECTION_COPY.DANGER_ZONE} isDestructive>
                <DangerZoneCard
                    isDeleteDialogOpen={isDeleteDialogOpen}
                    onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
                    onCloseDeleteDialog={() => setIsDeleteDialogOpen(false)}
                    onConfirmDelete={() => setIsDeleteDialogOpen(false)}
                />
            </SettingsSection>

            {hasOpenedLogoutDialog && (
                <SessionLogoutDialog
                    target={logoutTarget}
                    jwtTTL={jwtTTL}
                    onClose={() => setLogoutTarget(null)}
                    onConfirm={handleLogoutConfirm}
                />
            )}
        </div>
    );
}
