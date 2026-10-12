import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {ImportProgressBody} from "@/components/links/ImportProgressBody";
import {ImportCsvContent} from "@/components/links/ImportCsvContent";
import {IMPORT_SESSION_STATE, type ImportSession} from "@/lib/hooks/useLinkImport";
import {createImportJob} from "@/test/import-utils";

function createSession(state: ImportSession["state"] = IMPORT_SESSION_STATE.PROCESSING): ImportSession {
    return {job: {...createImportJob(), fileName: "x".repeat(240) + ".csv"}, state, progress: {processedRows: 3, totalRows: 10}};
}

describe("import progress view", () => {
    it("shows real counters, percentage, and accessible progress", () => {
        render(<ImportProgressBody session={createSession()}/>);
        expect(screen.getByText("3 of 10 rows processed")).toBeInTheDocument();
        expect(screen.getByText("30%")).toBeInTheDocument();
        const bar = screen.getByRole("progressbar", {name: "Import progress"});
        expect(bar).toHaveAttribute("aria-valuenow", "3");
        expect(bar).toHaveAttribute("aria-valuemax", "10");
    });

    it("animates the bar smoothly instead of jumping between values", () => {
        const {container, rerender} = render(<ImportProgressBody session={createSession()}/>);
        const fill = container.querySelector("[role='progressbar'] > div");
        expect(fill).toHaveStyle({width: "30%"});
        expect(fill).toHaveClass("transition-[width]", "duration-500", "ease-out", "motion-reduce:transition-none");
        rerender(<ImportProgressBody session={{...createSession(), progress: {processedRows: 6, totalRows: 10}}}/>);
        expect(fill).toHaveStyle({width: "60%"});
    });

    it("truncates a long filename and provides the full name via title", () => {
        const session = createSession();
        render(<ImportProgressBody session={session}/>);
        const filename = screen.getByText(session.job.fileName ?? "");
        expect(filename).toHaveClass("min-w-0", "truncate", "w-full");
        expect(filename).toHaveAttribute("title", session.job.fileName);
    });

    it("does not claim all rows succeeded when only processed counts are known", () => {
        const session = {...createSession(IMPORT_SESSION_STATE.COMPLETED), progress: {processedRows: 10, totalRows: 10}};
        render(<ImportProgressBody session={session}/>);
        expect(screen.getByText("Processing complete")).toBeInTheDocument();
        expect(screen.queryByText(/All rows were imported successfully/)).not.toBeInTheDocument();
        expect(screen.queryByText(/10 links imported/)).not.toBeInTheDocument();
    });

    it.each([true, false])("offers a links refresh without another upload while status is unknown (desktop=%s)", (isDesktop) => {
        const handleAction = (): void => undefined;
        render(<ImportCsvContent session={createSession(IMPORT_SESSION_STATE.INTERRUPTED)} file={null} generateTakenKeys={false}
            isUploading={false} isDesktop={isDesktop} onFileChange={handleAction} onGenerateTakenKeysChange={handleAction}
            onImport={handleAction} onClose={handleAction} onImportMore={handleAction} onRefreshLinks={handleAction}/>);
        expect(screen.getByRole("button", {name: "Refresh links"})).toBeEnabled();
        expect(screen.queryByRole("button", {name: "Reconnect"})).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Import more"})).not.toBeInTheDocument();
    });
});
