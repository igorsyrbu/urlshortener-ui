import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {IMPORT_FROM_CSV_LABEL} from "@/components/links/import-export-constants";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";

describe("toolbar import state on mobile", () => {
    afterEach(() => { resetImportTrackerForTests(); });

    it("disables the import drawer action and shows a spinner while an import is ongoing", async () => {
        const handleImportClick = vi.fn();
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: {processedRows: 3, totalRows: 10}, job: null});
        render(
            <PageToolbar showOptions showImportExport onImportCsvClick={handleImportClick}
                searchValue="" onSearchChange={() => undefined}/>,
        );
        expect(screen.getByRole("progressbar", {name: "Import progress"})).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole("button").find((button) => !button.getAttribute("aria-label")) as HTMLElement);
        const action = await screen.findByRole("button", {name: IMPORT_FROM_CSV_LABEL});
        expect(action).toBeDisabled();
        expect(action.querySelector("svg.animate-spin")).not.toBeNull();
        fireEvent.click(action);
        expect(handleImportClick).not.toHaveBeenCalled();
    });

    it("opens the import progress modal when the radial indicator is pressed", () => {
        const handleImportClick = vi.fn();
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: {processedRows: 3, totalRows: 10}, job: null});
        render(
            <PageToolbar showOptions showImportExport onImportCsvClick={handleImportClick}
                searchValue="" onSearchChange={() => undefined}/>,
        );
        fireEvent.click(screen.getByRole("button", {name: "View import progress"}));
        expect(handleImportClick).toHaveBeenCalledOnce();
    });
});
