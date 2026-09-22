import type {ImportFailure} from "@/lib/link-transfer";
import {
    RESULTS_DESTINATION_COLUMN,
    RESULTS_REASON_COLUMN,
    RESULTS_SHORT_LINK_COLUMN,
} from "@/components/links/import-export-constants";

interface ImportResultsCardsProps {
    failures: ImportFailure[];
}

const EMPTY_CELL_PLACEHOLDER = "—";

function formatLine(value: string | null): string {
    return value?.trim() ? value : EMPTY_CELL_PLACEHOLDER;
}

export function ImportResultsCards({failures}: ImportResultsCardsProps) {
    if (failures.length === 0) {
        return null;
    }

    return (
        <div className="max-h-64 overflow-y-auto">
            <div className="flex flex-col gap-2">
                {failures.map((failure, index) => (
                    <div
                        key={`${failure.shortLink}-${failure.destinationUrl}-${index}`}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3"
                    >
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {RESULTS_SHORT_LINK_COLUMN}
                            </p>
                            <p className="truncate text-sm font-medium text-foreground">
                                {formatLine(failure.shortLink)}
                            </p>
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {RESULTS_DESTINATION_COLUMN}
                            </p>
                            <p className="truncate text-sm text-foreground">
                                {formatLine(failure.destinationUrl)}
                            </p>
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {RESULTS_REASON_COLUMN}
                            </p>
                            <p className="break-words text-sm text-foreground">{failure.reason}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
