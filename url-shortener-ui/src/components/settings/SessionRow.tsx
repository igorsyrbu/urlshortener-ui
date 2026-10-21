import {Button} from "@/components/ui/button";
import {formatDeviceText, formatLocation, type UserSession} from "@/lib/session-utils";
import {DeviceIcon} from "@/components/settings/DeviceIcon";

export const SESSION_ROW_CLASS = "flex min-h-14 items-center gap-3 px-6 py-3";
export const SESSION_ICON_TILE_CLASS = "flex size-8 shrink-0 items-center justify-center rounded-lg border-[0.5px] border-border bg-muted text-muted-foreground";
export const CURRENT_DEVICE_LABEL = "This device";

interface SessionRowProps {
    session: UserSession;
    isCurrent?: boolean;
    isActionDisabled: boolean;
    isLoggingOut: boolean;
    onLogout: () => void;
}

export function SessionRow({session, isCurrent = false, isActionDisabled, isLoggingOut, onLogout}: SessionRowProps) {
    const deviceText = formatDeviceText(session);
    const location = formatLocation(session);

    return (
        <div role="group" aria-label={deviceText} className={SESSION_ROW_CLASS}>
            <div className={SESSION_ICON_TILE_CLASS}>
                <DeviceIcon session={session} className="size-4"/>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground" title={deviceText}>{deviceText}</p>
                    {isCurrent && (
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            {CURRENT_DEVICE_LABEL}
                        </span>
                    )}
                </div>
                <p className="truncate text-xs text-muted-foreground" title={location}>{location}</p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={onLogout} disabled={isActionDisabled}>
                {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
        </div>
    );
}
