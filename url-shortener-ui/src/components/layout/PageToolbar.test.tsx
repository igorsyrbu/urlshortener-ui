import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {EXPORT_AS_CSV_LABEL, IMPORT_FROM_CSV_LABEL} from "@/components/links/import-export-constants";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {getOptionsTrigger} from "@/test/page-toolbar-utils";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

const ONGOING_PROGRESS = {processedRows: 3, totalRows: 10};
const ARCHIVED_LABEL = "Show archived links";

interface ToolbarHandlers {
    onImportCsvClick: ReturnType<typeof vi.fn<() => void>>;
    onExportCsvClick: ReturnType<typeof vi.fn<() => void>>;
    onShowArchivedChange: ReturnType<typeof vi.fn<(value: boolean) => void>>;
    onSearchChange: ReturnType<typeof vi.fn<(value: string) => void>>;
}

function startOngoingImport(): void {
    useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: ONGOING_PROGRESS, job: null});
}

function renderLinksToolbar(overrides: {showArchived?: boolean} = {}): ToolbarHandlers {
    const handlers: ToolbarHandlers = {
        onImportCsvClick: vi.fn<() => void>(),
        onExportCsvClick: vi.fn<() => void>(),
        onShowArchivedChange: vi.fn<(value: boolean) => void>(),
        onSearchChange: vi.fn<(value: string) => void>(),
    };
    render(
        <PageToolbar
            showOptions
            showImportExport
            showArchived={overrides.showArchived}
            searchValue=""
            placeholder="Search by URL or title"
            {...handlers}
        />,
    );
    return handlers;
}

async function openOptionsMenu(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(getOptionsTrigger());
    await screen.findByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL});
}

describe("PageToolbar search", () => {
    it("reports what the user types", async () => {
        const user = userEvent.setup();
        const {onSearchChange} = renderLinksToolbar();

        await user.type(screen.getByPlaceholderText("Search by URL or title"), "a");

        expect(onSearchChange).toHaveBeenCalledExactlyOnceWith("a");
    });
});

describe("PageToolbar options", () => {
    it("hides the options menu unless it is requested", () => {
        render(<PageToolbar searchValue="" onSearchChange={vi.fn()}/>);

        expect(screen.queryAllByRole("button")).toHaveLength(0);
    });

    it("toggles archived links from the menu", async () => {
        const user = userEvent.setup();
        const {onShowArchivedChange} = renderLinksToolbar({showArchived: false});

        await openOptionsMenu(user);
        await user.click(screen.getByRole("menuitem", {name: new RegExp(ARCHIVED_LABEL)}));

        expect(onShowArchivedChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("turns archived links off when they are already shown", async () => {
        const user = userEvent.setup();
        const {onShowArchivedChange} = renderLinksToolbar({showArchived: true});

        await openOptionsMenu(user);
        await user.click(screen.getByRole("menuitem", {name: new RegExp(ARCHIVED_LABEL)}));

        expect(onShowArchivedChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("starts an import from the menu", async () => {
        const user = userEvent.setup();
        const {onImportCsvClick} = renderLinksToolbar();

        await openOptionsMenu(user);
        await user.click(screen.getByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL}));

        expect(onImportCsvClick).toHaveBeenCalledOnce();
    });

    it("starts an export from the menu", async () => {
        const user = userEvent.setup();
        const {onExportCsvClick} = renderLinksToolbar();

        await openOptionsMenu(user);
        await user.click(screen.getByRole("menuitem", {name: EXPORT_AS_CSV_LABEL}));

        expect(onExportCsvClick).toHaveBeenCalledOnce();
    });

    it("omits import and export without showImportExport", async () => {
        const user = userEvent.setup();
        render(<PageToolbar showOptions searchValue="" onSearchChange={vi.fn()}/>);

        await user.click(getOptionsTrigger());

        expect(await screen.findByRole("menuitem", {name: new RegExp(ARCHIVED_LABEL)})).toBeInTheDocument();
        expect(screen.queryByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL})).not.toBeInTheDocument();
    });
});

describe("toolbar import state", () => {
    afterEach(() => {
        resetImportTrackerForTests();
    });

    it("places the radial indicator between search and options while an import is ongoing", () => {
        startOngoingImport();

        renderLinksToolbar();

        const search = screen.getByPlaceholderText("Search by URL or title");
        const radial = screen.getByRole("progressbar", {name: "Import progress"});
        expect(search.compareDocumentPosition(radial) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(radial.compareDocumentPosition(getOptionsTrigger()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("disables the import menu item and shows a spinner while an import is ongoing", async () => {
        const user = userEvent.setup();
        startOngoingImport();
        const {onImportCsvClick} = renderLinksToolbar();

        await openOptionsMenu(user);
        const importItem = screen.getByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL});
        await user.click(importItem);

        expect(importItem).toHaveAttribute("aria-disabled", "true");
        expect(importItem.querySelector("svg.animate-spin")).not.toBeNull();
        expect(onImportCsvClick).not.toHaveBeenCalled();
    });

    it("keeps the import disabled when the import stream was interrupted", async () => {
        const user = userEvent.setup();
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.INTERRUPTED, progress: ONGOING_PROGRESS, job: null});
        renderLinksToolbar();

        await openOptionsMenu(user);

        expect(screen.getByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL})).toHaveAttribute("aria-disabled", "true");
        expect(screen.queryByRole("progressbar", {name: "Import progress"})).not.toBeInTheDocument();
    });

    it("restores the import menu item and removes the indicator when idle", async () => {
        const user = userEvent.setup();
        renderLinksToolbar();

        await openOptionsMenu(user);

        expect(screen.queryByRole("progressbar", {name: "Import progress"})).not.toBeInTheDocument();
        expect(screen.getByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL})).not.toHaveAttribute("aria-disabled", "true");
    });

    it("opens the import progress modal when the radial indicator is pressed", async () => {
        const user = userEvent.setup();
        startOngoingImport();
        const {onImportCsvClick} = renderLinksToolbar();

        await user.click(screen.getByRole("button", {name: "View import progress"}));

        expect(onImportCsvClick).toHaveBeenCalledOnce();
    });

    it("does not show the radial indicator on pages without import support", () => {
        startOngoingImport();

        render(<PageToolbar showOptions searchValue="" onSearchChange={vi.fn()}/>);

        expect(screen.queryByRole("progressbar", {name: "Import progress"})).not.toBeInTheDocument();
    });
});
