"use client";

import {Card, CardContent} from "@/components/ui/card";
import type {UserSession} from "@/lib/session-utils";
import {SESSION_CARD_CLASS} from "@/components/settings/SessionCardSkeleton";
import {SessionRow} from "@/components/settings/SessionRow";

interface OtherSessionsListProps {
    sessions: UserSession[];
    isLoading: boolean;
    sessionActionLoading: string | null;
    onLogoutSession: (id: string) => void;
}

export function OtherSessionsList({sessions, isLoading, sessionActionLoading, onLogoutSession}: OtherSessionsListProps) {
    // No placeholder while loading: most users have no other sessions, so reserving rows for an unknown count
    // would make everything below jump up once the list turns out to be empty.
    if (isLoading || sessions.length === 0) return null;

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <h3 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Active sessions</h3>
            <Card className={SESSION_CARD_CLASS}>
                <CardContent className="max-h-96 divide-y-[0.5px] divide-border overflow-y-auto p-0">
                    {sessions.map((session) => (
                        <SessionRow
                            key={session.id}
                            session={session}
                            isActionDisabled={sessionActionLoading !== null}
                            isLoggingOut={sessionActionLoading === session.id}
                            onLogout={() => onLogoutSession(session.id)}
                        />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
