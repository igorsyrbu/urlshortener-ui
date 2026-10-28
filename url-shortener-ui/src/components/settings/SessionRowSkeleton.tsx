import {SESSION_ICON_TILE_CLASS, SESSION_ROW_CLASS} from "@/components/settings/SessionRow";
import {Skeleton, SKELETON_PULSE_CLASS} from "@/components/ui/skeleton";
import {SkeletonText} from "@/components/ui/skeleton-text";
import {cn} from "@/lib/utils";

/** Same row geometry as `SessionRow`: text-sized bars inside the real text classes. */
export function SessionRowSkeleton() {
    return (
        <div className={SESSION_ROW_CLASS} aria-hidden="true">
            <div className={cn(SESSION_ICON_TILE_CLASS, SKELETON_PULSE_CLASS)}/>
            <div className="min-w-0 flex-1">
                <p className="text-sm"><SkeletonText className="w-32"/></p>
                <p className="text-xs"><SkeletonText className="w-40"/></p>
            </div>
            <Skeleton className="h-8 w-16 shrink-0 rounded-md"/>
        </div>
    );
}
