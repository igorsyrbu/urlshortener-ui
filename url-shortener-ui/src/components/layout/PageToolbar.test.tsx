import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {IMPORT_FROM_CSV_LABEL} from "@/components/links/import-export-constants";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

function renderLinksToolbar(): void {
    render(
        <PageToolbar
            showOptions
            showImportExport
            onImportCsvClick={() => undefined}
            onExportCsvClick={() => undefined}
            searchValue=""
            onSearchChange={() => undefined}
            placeholder="Search by URL or title"
        />,
    );
}

async function openOptionsMenu(): Promise<HTMLElement> {
    const trigger = getOptionsTrigger();
    fireEvent.pointerDown(trigger, {button: 0});
    fireEvent.click(trigger);
    return screen.findByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL});
}

function getOptionsTrigger(): HTMLElement {
    const trigger = screen.getAllByRole("button").find((button) => !button.getAttribute("aria-label"));
    if (!trigger) throw new Error("Options trigger not found");
    return trigger as HTMLElement;
}

describe("toolbar import state", () => {
    afterEach(() => { resetImportTrackerForTests(); });

    it("places the radial indicator between search and options while an import is ongoing", () => {
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: {processedRows: 3, totalRows: 10}, job: null});
        renderLinksToolbar();
        const search = screen.getByPlaceholderText("Search by URL or title");
        const radial = screen.getByRole("progressbar", {name: "Import progress"});
        const options = getOptionsTrigger();
        expect(search.compareDocumentPosition(radial) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(radial.compareDocumentPosition(options) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("disables the import menu item and shows a spinner while an import is ongoing", async () => {
        const handleImportClick = vi.fn();
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: {processedRows: 3, totalRows: 10}, job: null});
        render(
            <PageToolbar showOptions showImportExport onImportCsvClick={handleImportClick}
                searchValue="" onSearchChange={() => undefined}/>,
        );
        const menuItem = await openOptionsMenu();
        expect(menuItem).toHaveAttribute("aria-disabled", "true");
        expect(menuItem.querySelector("svg.animate-spin")).not.toBeNull();
        fireEvent.click(menuItem);
        expect(handleImportClick).not.toHaveBeenCalled();
    });

    it("restores the import menu item and removes the indicator when idle", async () => {
        const handleImportClick = vi.fn();
        render(
            <PageToolbar showOptions showImportExport onImportCsvClick={handleImportClick}
                searchValue="" onSearchChange={() => undefined}/>,
        );
        expect(screen.queryByRole("progressbar", {name: "Import progress"})).not.toBeInTheDocument();
        const menuItem = await openOptionsMenu();
        expect(menuItem).not.toHaveAttribute("aria-disabled", "true");
        expect(menuItem.querySelector("svg.animate-spin")).toBeNull();
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
