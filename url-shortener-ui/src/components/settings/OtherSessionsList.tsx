"use client";

import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {formatDeviceText, formatLocation, getIconForDevice, UserSession} from "@/lib/session-utils";

interface OtherSessionsListProps {
    sessions: UserSession[];
    sessionActionLoading: string | null;
    onLogoutSession: (id: string) => void;
}

export function OtherSessionsList({sessions, sessionActionLoading, onLogoutSession}: OtherSessionsListProps) {
    if (sessions.length === 0) return null;

    return (
        <div className="mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Active Sessions
            </h3>
            <Card className="overflow-hidden border-border">
                <CardContent className="p-0 -mt-6 -mb-6 divide-y-[0.5px] divide-border max-h-[385px] overflow-y-auto">
                    {sessions.map((session) => {
                        const Icon = getIconForDevice(session.device, session.os);
                        const isActionLoading = sessionActionLoading === session.id;

                        return (
                            <div
                                key={session.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted text-foreground shrink-0 transition-colors">
                                        <Icon className="h-5 w-5"/>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium">{formatDeviceText(session)}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatLocation(session)}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => onLogoutSession(session.id)}
                                    disabled={isActionLoading || sessionActionLoading !== null}
                                >
                                    {isActionLoading ? "Logging out..." : "Log out"}
                                </Button>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
