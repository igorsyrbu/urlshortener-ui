"use client";

import {useState} from "react";
import dynamic from "next/dynamic";
import {useAuthStore} from "@/lib/store/auth";
import {getJwtTTL} from "@/lib/utils";
import {OTHER_SESSIONS_ACTION, useUserSessions} from "@/lib/hooks/useUserSessions";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";
import {SETTINGS_SECTION_COPY} from "@/lib/settings-constants";
import {SettingsSection} from "@/components/settings/SettingsSection";
import {CurrentSessionCard} from "@/components/settings/CurrentSessionCard";
import {OtherSessionsList} from "@/components/settings/OtherSessionsList";
import type {LogoutTarget} from "@/components/settings/SessionLogoutDialog";

const SessionLogoutDialog = dynamic(
    () => import("@/components/settings/SessionLogoutDialog").then((dialogModule) => dialogModule.SessionLogoutDialog),
    {ssr: false},
);

/** The current device, the other signed-in devices, and the confirmation before logging any of them out. */
export function SessionsSection() {
    const {currentSession, otherSessions, isLoadingSessions, pendingSessionAction, logoutSession, logoutOtherSessions} = useUserSessions();
    const accessToken = useAuthStore((state) => state.accessToken);
    const [logoutTarget, setLogoutTarget] = useState<LogoutTarget>(null);
    const hasOpenedLogoutDialog = useHasBeenOpened(logoutTarget !== null);

    const handleLogoutConfirm = () => {
        if (logoutTarget?.type === "single") void logoutSession(logoutTarget.id, logoutTarget.isCurrent);
        if (logoutTarget?.type === "other") void logoutOtherSessions();
        setLogoutTarget(null);
    };

    const handleLogoutCurrentSession = () => {
        if (!currentSession) return;
        setLogoutTarget({type: "single", id: currentSession.id, isCurrent: true});
    };

    return (
        <SettingsSection {...SETTINGS_SECTION_COPY.SESSIONS}>
            <CurrentSessionCard
                session={currentSession}
                isLoading={isLoadingSessions}
                hasOtherSessions={otherSessions.length > 0}
                isActionDisabled={pendingSessionAction !== null}
                isLoggingOut={pendingSessionAction === currentSession?.id}
                isTerminatingOther={pendingSessionAction === OTHER_SESSIONS_ACTION}
                onLogout={handleLogoutCurrentSession}
                onTerminateOther={() => setLogoutTarget({type: "other"})}
            />
            <OtherSessionsList
                sessions={otherSessions}
                isLoading={isLoadingSessions}
                sessionActionLoading={pendingSessionAction}
                onLogoutSession={(id) => setLogoutTarget({type: "single", id, isCurrent: false})}
            />
            {hasOpenedLogoutDialog && (
                <SessionLogoutDialog
                    target={logoutTarget}
                    jwtTTL={accessToken ? getJwtTTL(accessToken) : null}
                    onClose={() => setLogoutTarget(null)}
                    onConfirm={handleLogoutConfirm}
                />
            )}
        </SettingsSection>
    );
}
