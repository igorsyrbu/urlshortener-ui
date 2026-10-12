import {CheckCircle2, LoaderCircle, TriangleAlert} from "lucide-react";
import {IMPORT_SESSION_STATE, type ImportSession} from "@/lib/hooks/useLinkImport";
import {
    buildImportProgressMessage, buildImportSummaryMessage, IMPORT_PROCESSED_HINT, IMPORT_PROCESSED_TITLE,
    IMPORT_PROCESSING_HINT, IMPORT_PROGRESS_ARIA_LABEL, IMPORT_PROGRESS_TITLE, IMPORT_PROGRESS_UNAVAILABLE_HINT,
    IMPORT_PROGRESS_UNAVAILABLE_TITLE,
} from "@/components/links/import-export-constants";

interface ImportProgressBodyProps {
    session: ImportSession;
}

const FULL_PERCENT = 100;

export function ImportProgressBody({session}: ImportProgressBodyProps) {
    const {job, progress, state} = session;
    const isCompleted = state === IMPORT_SESSION_STATE.COMPLETED;
    const isInterrupted = state === IMPORT_SESSION_STATE.INTERRUPTED;
    const title = isCompleted ? IMPORT_PROCESSED_TITLE : isInterrupted ? IMPORT_PROGRESS_UNAVAILABLE_TITLE : IMPORT_PROGRESS_TITLE;
    const hint = isCompleted ? IMPORT_PROCESSED_HINT : isInterrupted ? IMPORT_PROGRESS_UNAVAILABLE_HINT : IMPORT_PROCESSING_HINT;
    const percentage = progress.totalRows > 0 ? Math.floor(progress.processedRows / progress.totalRows * FULL_PERCENT) : 0;
    const progressMessage = buildImportProgressMessage(progress.processedRows, progress.totalRows);

    return (
        <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col items-center gap-3 text-center">
                {isCompleted ? <CheckCircle2 className="size-10 text-success" aria-hidden="true"/> :
                    isInterrupted ? <TriangleAlert className="size-10 text-muted-foreground" aria-hidden="true"/> :
                        <LoaderCircle className="size-10 animate-spin text-primary" aria-hidden="true"/>}
                <h2 className="text-lg font-semibold leading-none text-foreground">{title}</h2>
                {job.fileName && <p className="w-full min-w-0 truncate text-sm text-muted-foreground" title={job.fileName}>{job.fileName}</p>}
            </div>
            <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center justify-between gap-3 text-sm tabular-nums" aria-live="polite">
                    <span className="min-w-0">{progressMessage}</span>
                    <span className="shrink-0 text-muted-foreground">{percentage}%</span>
                </div>
                <div
                    role="progressbar"
                    aria-label={IMPORT_PROGRESS_ARIA_LABEL}
                    aria-valuemin={0}
                    aria-valuemax={progress.totalRows > 0 ? progress.totalRows : 1}
                    aria-valuenow={Math.min(progress.processedRows, progress.totalRows)}
                    aria-valuetext={progressMessage}
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                >
                    <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                        style={{width: `${percentage}%`}}
                    />
                </div>
            </div>
            {isCompleted && job.status === "COMPLETED" && (
                <p className="text-center text-sm text-muted-foreground">{buildImportSummaryMessage(job.succeededRows, job.failedRows)}</p>
            )}
            <p className="text-center text-sm text-muted-foreground">{hint}</p>
        </div>
    );
}
