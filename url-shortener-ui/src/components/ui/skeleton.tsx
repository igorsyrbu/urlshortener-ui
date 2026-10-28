import {cn} from "@/lib/utils";

/** The pulse of every loading placeholder. Used on its own where the shape comes from elsewhere: a whole card, a badge. */
export const SKELETON_PULSE_CLASS = "animate-pulse";
export const SKELETON_FILL_CLASS = "rounded bg-muted";

interface SkeletonProps {
    className?: string;
}

/** A block placeholder; size and radius come from `className`. */
export function Skeleton({className}: SkeletonProps) {
    return <div aria-hidden="true" className={cn(SKELETON_FILL_CLASS, SKELETON_PULSE_CLASS, className)}/>;
}
