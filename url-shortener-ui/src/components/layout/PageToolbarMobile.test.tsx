import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {EXPORT_AS_CSV_LABEL, IMPORT_FROM_CSV_LABEL} from "@/components/links/import-export-constants";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {getOptionsTrigger} from "@/test/page-toolbar-utils";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => false, useIsMobile: () => true}));

const ONGOING_PROGRESS = {processedRows: 3, totalRows: 10};

interface ToolbarHandlers {
    onImportCsvClick: ReturnType<typeof vi.fn<() => void>>;
    onExportCsvClick: ReturnType<typeof vi.fn<() => void>>;
    onShowArchivedChange: ReturnType<typeof vi.fn<(value: boolean) => void>>;
}

function renderLinksToolbar(): ToolbarHandlers {
    const handlers: ToolbarHandlers = {
        onImportCsvClick: vi.fn<() => void>(),
        onExportCsvClick: vi.fn<() => void>(),
        onShowArchivedChange: vi.fn<(value: boolean) => void>(),
    };
    render(<PageToolbar showOptions showImportExport searchValue="" onSearchChange={vi.fn()} {...handlers}/>);
    return handlers;
}

async function openOptionsDrawer(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(getOptionsTrigger());
    await screen.findByRole("button", {name: IMPORT_FROM_CSV_LABEL});
}

describe("toolbar options on mobile", () => {
    it("toggles archived links from the drawer", async () => {
        const user = userEvent.setup();
        const {onShowArchivedChange} = renderLinksToolbar();

        await openOptionsDrawer(user);
        await user.click(screen.getByRole("button", {name: /Show archived links/}));

        expect(onShowArchivedChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("starts an import from the drawer", async () => {
        const user = userEvent.setup();
        const {onImportCsvClick} = renderLinksToolbar();

        await openOptionsDrawer(user);
        await user.click(screen.getByRole("button", {name: IMPORT_FROM_CSV_LABEL}));

        expect(onImportCsvClick).toHaveBeenCalledOnce();
    });

    it("starts an export from the drawer", async () => {
        const user = userEvent.setup();
        const {onExportCsvClick} = renderLinksToolbar();

        await openOptionsDrawer(user);
        await user.click(screen.getByRole("button", {name: EXPORT_AS_CSV_LABEL}));

        expect(onExportCsvClick).toHaveBeenCalledOnce();
    });
});

describe("toolbar import state on mobile", () => {
    afterEach(() => {
        resetImportTrackerForTests();
    });

    it("disables the import drawer action and shows a spinner while an import is ongoing", async () => {
        const user = userEvent.setup();
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: ONGOING_PROGRESS, job: null});
        renderLinksToolbar();
        const progressIndicator = screen.getByRole("progressbar", {name: "Import progress"});

        await openOptionsDrawer(user);
        const importAction = screen.getByRole("button", {name: IMPORT_FROM_CSV_LABEL});

        expect(progressIndicator).toBeInTheDocument();
        expect(importAction).toBeDisabled();
        expect(importAction.querySelector("svg.animate-spin")).not.toBeNull();
    });

    it("opens the import progress modal when the radial indicator is pressed", async () => {
        const user = userEvent.setup();
        useImportTracker.setState({status: IMPORT_TRACKING_STATUS.ACTIVE, progress: ONGOING_PROGRESS, job: null});
        const {onImportCsvClick} = renderLinksToolbar();

        await user.click(screen.getByRole("button", {name: "View import progress"}));

        expect(onImportCsvClick).toHaveBeenCalledOnce();
    });
});
