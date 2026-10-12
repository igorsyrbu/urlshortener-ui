import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {ImportProgressBody} from "@/components/links/ImportProgressBody";
import {ImportCsvContent} from "@/components/links/ImportCsvContent";
import {
    buildImportSummaryMessage,
    IMPORT_PROCESSED_TITLE,
    IMPORT_PROGRESS_ARIA_LABEL,
    IMPORT_PROGRESS_TITLE,
    IMPORT_PROGRESS_UNAVAILABLE_HINT,
    IMPORT_PROGRESS_UNAVAILABLE_TITLE,
    IMPORT_PROCESSING_HINT,
    REFRESH_LINKS_LABEL,
} from "@/components/links/import-export-constants";
import {IMPORT_SESSION_STATE, type ImportSession} from "@/lib/hooks/useLinkImport";
import {createImportJob} from "@/test/import-utils";

const LONG_FILE_NAME = `${"x".repeat(240)}.csv`;

function createSession(state: ImportSession["state"] = IMPORT_SESSION_STATE.PROCESSING, processedRows = 3): ImportSession {
    return {job: {...createImportJob(), fileName: LONG_FILE_NAME}, state, progress: {processedRows, totalRows: 10}};
}

describe("import progress view", () => {
    it("shows real counters, percentage, and accessible progress", () => {
        render(<ImportProgressBody session={createSession()}/>);

        expect(screen.getByText("3 of 10 rows processed")).toBeInTheDocument();
        expect(screen.getByText("30%")).toBeInTheDocument();
        const bar = screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL});
        expect(bar).toHaveAttribute("aria-valuenow", "3");
        expect(bar).toHaveAttribute("aria-valuemax", "10");
    });

    it("follows the processed row count as it grows", () => {
        const {rerender} = render(<ImportProgressBody session={createSession(IMPORT_SESSION_STATE.PROCESSING, 3)}/>);

        rerender(<ImportProgressBody session={createSession(IMPORT_SESSION_STATE.PROCESSING, 6)}/>);

        expect(screen.getByText("60%")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL})).toHaveAttribute("aria-valuenow", "6");
    });

    it("rounds the percentage down so an unfinished import never reads 100%", () => {
        render(<ImportProgressBody session={{...createSession(), progress: {processedRows: 999, totalRows: 1000}}}/>);

        expect(screen.getByText("99%")).toBeInTheDocument();
    });

    it("shows 0% without dividing by zero when the total is unknown", () => {
        render(<ImportProgressBody session={{...createSession(), progress: {processedRows: 0, totalRows: 0}}}/>);

        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL})).toHaveAttribute("aria-valuemax", "1");
    });

    it("provides the full file name for a long file name", () => {
        render(<ImportProgressBody session={createSession()}/>);

        expect(screen.getByText(LONG_FILE_NAME)).toHaveAttribute("title", LONG_FILE_NAME);
    });

    it("omits the file name for a discovered import that has none", () => {
        const session = createSession();

        render(<ImportProgressBody session={{...session, job: {...session.job, fileName: null}}}/>);

        expect(screen.queryByTitle(LONG_FILE_NAME)).not.toBeInTheDocument();
    });

    it("tells the user they can close the window while rows are processed", () => {
        render(<ImportProgressBody session={createSession()}/>);

        expect(screen.getByText(IMPORT_PROGRESS_TITLE)).toBeInTheDocument();
        expect(screen.getByText(IMPORT_PROCESSING_HINT)).toBeInTheDocument();
    });

    it("explains that progress updates are unavailable after an interruption", () => {
        render(<ImportProgressBody session={createSession(IMPORT_SESSION_STATE.INTERRUPTED)}/>);

        expect(screen.getByText(IMPORT_PROGRESS_UNAVAILABLE_TITLE)).toBeInTheDocument();
        expect(screen.getByText(IMPORT_PROGRESS_UNAVAILABLE_HINT)).toBeInTheDocument();
    });

    it("does not claim all rows succeeded when only processed counts are known", () => {
        render(<ImportProgressBody session={createSession(IMPORT_SESSION_STATE.COMPLETED, 10)}/>);

        expect(screen.getByText(IMPORT_PROCESSED_TITLE)).toBeInTheDocument();
        expect(screen.queryByText(/All rows were imported successfully/)).not.toBeInTheDocument();
        expect(screen.queryByText(/10 links imported/)).not.toBeInTheDocument();
    });

    it("summarises imported and failed rows once the job reports completion", () => {
        const session = createSession(IMPORT_SESSION_STATE.COMPLETED, 10);
        const completedJob = {...session.job, status: "COMPLETED" as const, succeededRows: 8, failedRows: 2};

        render(<ImportProgressBody session={{...session, job: completedJob}}/>);

        expect(screen.getByText(buildImportSummaryMessage(8, 2))).toBeInTheDocument();
    });

    it.each([true, false])("offers a links refresh without another upload while status is unknown (desktop=%s)", (isDesktop) => {
        const handleAction = (): void => undefined;

        render(<ImportCsvContent session={createSession(IMPORT_SESSION_STATE.INTERRUPTED)} file={null} generateTakenKeys={false}
            isUploading={false} isDesktop={isDesktop} onFileChange={handleAction} onGenerateTakenKeysChange={handleAction}
            onImport={handleAction} onClose={handleAction} onImportMore={handleAction} onRefreshLinks={handleAction}/>);

        expect(screen.getByRole("button", {name: REFRESH_LINKS_LABEL})).toBeEnabled();
        expect(screen.queryByRole("button", {name: "Reconnect"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Import more"})).not.toBeInTheDocument();
    });
});
