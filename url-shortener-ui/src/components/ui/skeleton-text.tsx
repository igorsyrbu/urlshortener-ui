import {SKELETON_FILL_CLASS, SKELETON_PULSE_CLASS} from "@/components/ui/skeleton";
import {cn} from "@/lib/utils";

const NON_BREAKING_SPACE = " ";

interface SkeletonTextProps {
    className?: string;
}

/**
 * A bar exactly one line of the surrounding text tall: place it inside the real text element (`<p className="text-sm">`)
 * so the loaded text takes the same height. Width comes from `className`.
 */
export function SkeletonText({className}: SkeletonTextProps) {
    return (
        <span aria-hidden="true" className={cn("inline-block", SKELETON_FILL_CLASS, SKELETON_PULSE_CLASS, className)}>
            {NON_BREAKING_SPACE}
        </span>
    );
}
