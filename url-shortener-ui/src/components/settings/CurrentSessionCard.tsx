"use client";

import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {formatDeviceText, formatLocation, getIconForDevice, UserSession} from "@/lib/session-utils";

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
    return (
        <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                This Device
            </h3>
            <Card className="overflow-hidden border-border">
                {isLoading ? (
                    <CardContent className="px-4 pt-4 pb-0">
                        <div className="text-sm text-muted-foreground">Loading current session...</div>
                    </CardContent>
                ) : session ? (
                    <CardContent className="p-0 -mt-6">
                        <SessionRow session={session} isCurrent isActionDisabled={isActionDisabled}
                                    isLoggingOut={isLoggingOut} onLogout={onLogout}/>

                        {hasOtherSessions && (
                            <div
                                className="border-t-[0.5px] border-border -mb-3 pt-2 px-4 flex items-center transition-colors">
                                <button
                                    className="text-[13px] font-medium text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full text-left"
                                    onClick={onTerminateOther}
                                    disabled={isActionDisabled}
                                >
                                    {isTerminatingOther ? "Terminating..." : "Terminate all other sessions"}
                                </button>
                            </div>
                        )}
                    </CardContent>
                ) : (
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Current session information unavailable.</div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

interface SessionRowProps {
    session: UserSession;
    isCurrent?: boolean;
    isActionDisabled: boolean;
    isLoggingOut: boolean;
    onLogout: () => void;
}

function SessionRow({session, isCurrent, isActionDisabled, isLoggingOut, onLogout}: SessionRowProps) {
    const Icon = getIconForDevice(session.device, session.os);
    const deviceText = formatDeviceText(session);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-4">
                <div
                    className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted text-foreground shrink-0 transition-colors">
                    <Icon className="h-5 w-5"/>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{deviceText}</p>
                        {isCurrent && (
                            <span
                                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                Current
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatLocation(session)}</p>
                </div>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={onLogout}
                disabled={isActionDisabled}
            >
                {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
        </div>
    );
}
