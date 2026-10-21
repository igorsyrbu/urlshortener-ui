"use client";

import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import type {UserSession} from "@/lib/session-utils";
import {SESSION_CARD_CLASS, SessionCardSkeleton} from "@/components/settings/SessionCardSkeleton";
import {SessionRow} from "@/components/settings/SessionRow";
import {SettingsCardFooter} from "@/components/settings/SettingsCardFooter";

interface CurrentSessionCardProps {
    session: UserSession | undefined;
    isLoading: boolean;
    hasOtherSessions: boolean;
    isActionDisabled: boolean;
    isLoggingOut: boolean;
    isTerminatingOther: boolean;
    onLogout: () => void;
    onTerminateOther: () => void;
}

export function CurrentSessionCard({
                                       session,
                                       isLoading,
                                       hasOtherSessions,
                                       isActionDisabled,
                                       isLoggingOut,
                                       isTerminatingOther,
                                       onLogout,
                                       onTerminateOther,
                                   }: CurrentSessionCardProps) {
    if (isLoading) {
        return <SessionCardSkeleton/>;
    }

    return (
        <Card className={SESSION_CARD_CLASS}>
            <CardContent className="p-0">
                {session ? (
                    <SessionRow session={session} isCurrent isActionDisabled={isActionDisabled}
                                isLoggingOut={isLoggingOut} onLogout={onLogout}/>
                ) : (
                    <p className="px-6 py-4 text-sm text-muted-foreground">Current session information unavailable.</p>
                )}
            </CardContent>
            {session && hasOtherSessions && (
                <SettingsCardFooter>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
                            onClick={onTerminateOther} disabled={isActionDisabled}>
                        {isTerminatingOther ? "Logging out..." : "Log out all other sessions"}
                    </Button>
                </SettingsCardFooter>
            )}
        </Card>
    );
}
