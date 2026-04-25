"use client";

import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {fetchWithAuth} from "@/lib/api";
import {useAuthStore} from "@/lib/store/auth";
import {getJwtTTL} from "@/lib/utils";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {UserSession} from "@/lib/session-utils";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageHeading} from "@/components/layout/PageHeading";
import {ProfileCard} from "@/components/settings/ProfileCard";
import {AppearanceCard} from "@/components/settings/AppearanceCard";
import {CurrentSessionCard} from "@/components/settings/CurrentSessionCard";
import {OtherSessionsList} from "@/components/settings/OtherSessionsList";
import {DangerZoneCard} from "@/components/settings/DangerZoneCard";
import {SessionLogoutDialog, LogoutTarget} from "@/components/settings/SessionLogoutDialog";

export default function SettingsPage() {
    const router = useRouter();
    const accessToken = useAuthStore((state) => state.accessToken);

    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(true);
    const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);
    const [logoutTarget, setLogoutTarget] = useState<LogoutTarget>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [jwtTTL, setJwtTTL] = useState<string | null>(null);

    const fetched = useRef(false);

    useEffect(() => {
        if (!fetched.current) {
            fetchSessions();
            if (accessToken) {
                setJwtTTL(getJwtTTL(accessToken));
            }
            fetched.current = true;
        }
    }, [accessToken]);

    const fetchSessions = async () => {
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS);
            if (res.ok) {
                const data: UserSession[] = await res.json();
                data.sort((a, b) => (a.current === b.current ? 0 : a.current ? -1 : 1));
                setSessions(data);
            }
        } catch (error) {
            console.error("Failed to load sessions", error);
        } finally {
            setIsLoadingSessions(false);
        }
    };

    const handleLogoutSession = async (id: string, isCurrent: boolean = false) => {
        setSessionActionLoading(id);
        try {
            const endpoint = isCurrent ? API_ENDPOINTS.USERS_SESSIONS_CURRENT : `/users/sessions/${id}`;
            const res = await fetchWithAuth(endpoint, {method: "DELETE"});

            if (res.ok) {
                if (isCurrent) {
                    useAuthStore.getState().logout();
                    router.replace(ROUTES.LOGIN);
                } else {
                    setSessions((prev) => prev.filter((s) => s.id !== id));
                    toast.success("Session terminated successfully");
                }
            } else {
                toast.error("Failed to terminate session");
            }
        } catch (error) {
            console.error("Error terminating session", error);
            toast.error("An unexpected error occurred while terminating session");
        } finally {
            setSessionActionLoading(null);
        }
    };

    const handleLogoutOther = async () => {
        setSessionActionLoading("other");
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.USERS_SESSIONS_OTHER, {method: "DELETE"});
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s.current));
                toast.success("Successfully logged out of all other devices");
            } else {
                toast.error("Failed to terminate other sessions");
            }
        } catch (error) {
            console.error("Error terminating other sessions", error);
            toast.error("An unexpected error occurred while terminating other sessions");
        } finally {
            setSessionActionLoading(null);
        }
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

    return (
        <PageContainer>
            <PageHeading>Settings</PageHeading>

            <ProfileCard/>
            <AppearanceCard/>

            <div className="flex flex-col gap-4">
                <CurrentSessionCard
                    session={currentSession}
                    isLoading={isLoadingSessions}
                    hasOtherSessions={otherSessions.length > 0}
                    isActionDisabled={sessionActionLoading !== null}
                    isLoggingOut={sessionActionLoading === currentSession?.id}
                    isTerminatingOther={sessionActionLoading === "other"}
                    onLogout={() => setLogoutTarget({type: "single", id: currentSession!.id, isCurrent: true})}
                    onTerminateOther={() => setLogoutTarget({type: "other"})}
                />
                <OtherSessionsList
                    sessions={otherSessions}
                    sessionActionLoading={sessionActionLoading}
                    onLogoutSession={(id) => setLogoutTarget({type: "single", id, isCurrent: false})}
                />
            </div>

            <DangerZoneCard
                isDeleteDialogOpen={isDeleteDialogOpen}
                onOpenDeleteDialog={() => setIsDeleteDialogOpen(true)}
                onCloseDeleteDialog={() => setIsDeleteDialogOpen(false)}
                onConfirmDelete={() => setIsDeleteDialogOpen(false)}
            />

            <SessionLogoutDialog
                target={logoutTarget}
                jwtTTL={jwtTTL}
                onClose={() => setLogoutTarget(null)}
                onConfirm={handleLogoutConfirm}
            />
        </PageContainer>
    );
}
