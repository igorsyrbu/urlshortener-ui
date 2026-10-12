import {cn} from "@/lib/utils";
import {
    buildImportProgressMessage,
    IMPORT_PROGRESS_ARIA_LABEL,
    VIEW_IMPORT_PROGRESS_LABEL,
} from "@/components/links/import-export-constants";

interface ImportRadialProgressProps {
    processedRows: number;
    totalRows: number;
    onPress?: () => void;
    className?: string;
}

const FULL_PERCENT = 100;
const CIRCLE_RADIUS = 15;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const RING_STROKE_WIDTH = 4;

const INDICATOR_BASE_CLASS =
    "flex h-10 w-10 shrink-0 items-center justify-center animate-in fade-in zoom-in duration-300 motion-reduce:animate-none";

export function ImportRadialProgress({processedRows, totalRows, onPress, className}: ImportRadialProgressProps) {
    const percentage = totalRows > 0
        ? Math.min(FULL_PERCENT, Math.floor(processedRows / totalRows * FULL_PERCENT))
        : 0;
    const dashOffset = CIRCLE_CIRCUMFERENCE - CIRCLE_CIRCUMFERENCE * percentage / FULL_PERCENT;
    const label = buildImportProgressMessage(processedRows, totalRows);

    const indicator = (
        <div
            role="progressbar"
            aria-label={IMPORT_PROGRESS_ARIA_LABEL}
            aria-valuemin={0}
            aria-valuemax={totalRows > 0 ? totalRows : 1}
            aria-valuenow={Math.min(processedRows, totalRows)}
            aria-valuetext={label}
            className="relative flex size-full items-center justify-center"
        >
            <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden="true">
                <circle
                    cx="18"
                    cy="18"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    strokeWidth={RING_STROKE_WIDTH}
                    className="stroke-current text-muted"
                />
                <circle
                    cx="18"
                    cy="18"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    strokeWidth={RING_STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    className="stroke-current text-primary transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
                />
            </svg>
            <span className="absolute text-[10px] font-semibold tabular-nums text-foreground" aria-hidden="true">
                {percentage}%
            </span>
        </div>
    );

    if (!onPress) {
        return <div title={label} className={cn(INDICATOR_BASE_CLASS, className)}>{indicator}</div>;
    }
    return (
        <button
            type="button"
            onClick={onPress}
            aria-label={VIEW_IMPORT_PROGRESS_LABEL}
            title={label}
            className={cn(
                INDICATOR_BASE_CLASS,
                "cursor-pointer rounded-full transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                className,
            )}
        >
            {indicator}
        </button>
    );
}
