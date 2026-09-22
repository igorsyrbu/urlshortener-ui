import type {ImportFailure} from "@/lib/link-transfer";
import {OverflowTooltip} from "@/components/ui/overflow-tooltip";
import {
    RESULTS_DESTINATION_COLUMN,
    RESULTS_REASON_COLUMN,
    RESULTS_SHORT_LINK_COLUMN,
} from "@/components/links/import-export-constants";

interface ImportResultsTableProps {
    failures: ImportFailure[];
}

const EMPTY_CELL_PLACEHOLDER = "—";

function hasValue(value: string | null): value is string {
    return !!value?.trim();
}

export function ImportResultsTable({failures}: ImportResultsTableProps) {
    if (failures.length === 0) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-border">
            <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-left text-sm">
                    <colgroup>
                        <col className="w-1/4"/>
                        <col className="w-[30%]"/>
                        <col className="w-[45%]"/>
                    </colgroup>
                    <thead className="sticky top-0 bg-muted">
                    <tr className="text-xs font-medium text-muted-foreground">
                        <th className="px-3 py-2 font-medium">{RESULTS_SHORT_LINK_COLUMN}</th>
                        <th className="px-3 py-2 font-medium">{RESULTS_DESTINATION_COLUMN}</th>
                        <th className="px-3 py-2 font-medium">{RESULTS_REASON_COLUMN}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {failures.map((failure, index) => (
                        <tr key={`${failure.shortLink}-${failure.destinationUrl}-${index}`}>
                            <td className="px-3 py-2 text-foreground">
                                {hasValue(failure.shortLink) ? (
                                    <OverflowTooltip value={failure.shortLink.trim()} className="block"/>
                                ) : (
                                    EMPTY_CELL_PLACEHOLDER
                                )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                                {hasValue(failure.destinationUrl) ? (
                                    <OverflowTooltip value={failure.destinationUrl.trim()} className="block"/>
                                ) : (
                                    EMPTY_CELL_PLACEHOLDER
                                )}
                            </td>
                            <td className="break-all px-3 py-2 text-foreground">
                                {failure.reason}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
