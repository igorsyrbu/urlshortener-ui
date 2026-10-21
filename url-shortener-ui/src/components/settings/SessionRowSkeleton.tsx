import {SESSION_ICON_TILE_CLASS, SESSION_ROW_CLASS} from "@/components/settings/SessionRow";

const TEXT_PULSE_CLASS = "inline-block rounded bg-muted animate-pulse";

/** Same row geometry as `SessionRow`: text-sized bars inside the real text classes. */
export function SessionRowSkeleton() {
    return (
        <div className={SESSION_ROW_CLASS} aria-hidden="true">
            <div className={`${SESSION_ICON_TILE_CLASS} animate-pulse`}/>
            <div className="min-w-0 flex-1">
                <p className="text-sm"><span className={`${TEXT_PULSE_CLASS} w-32`}>&nbsp;</span></p>
                <p className="text-xs"><span className={`${TEXT_PULSE_CLASS} w-40`}>&nbsp;</span></p>
            </div>
            <div className="h-8 w-16 shrink-0 rounded-md bg-muted animate-pulse"/>
        </div>
    );
}
