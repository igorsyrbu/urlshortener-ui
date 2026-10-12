import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ImportCsvContent} from "@/components/links/ImportCsvContent";
import {
    DONE_LABEL,
    GENERATE_TAKEN_KEYS_LABEL,
    IMPORT_LABEL,
    IMPORT_MORE_LABEL,
    IMPORT_PROCESSED_TITLE,
    IMPORT_PROGRESS_TITLE,
    IMPORTING_LABEL,
    CANCEL_LABEL,
    CLOSE_LABEL,
    DROPZONE_HINT,
    REFRESH_LINKS_LABEL,
} from "@/components/links/import-export-constants";
import {IMPORT_SESSION_STATE, type ImportSession} from "@/lib/hooks/useLinkImport";
import {createImportJob} from "@/test/import-utils";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

type ContentProps = Parameters<typeof ImportCsvContent>[0];

interface ContentHandlers {
    onFileChange: ReturnType<typeof vi.fn<(file: File | null) => void>>;
    onGenerateTakenKeysChange: ReturnType<typeof vi.fn<(value: boolean) => void>>;
    onImport: ReturnType<typeof vi.fn<() => void>>;
    onClose: ReturnType<typeof vi.fn<() => void>>;
    onImportMore: ReturnType<typeof vi.fn<() => void>>;
    onRefreshLinks: ReturnType<typeof vi.fn<() => void>>;
}

function createSession(state: ImportSession["state"]): ImportSession {
    return {job: createImportJob(), state, progress: {processedRows: 3, totalRows: 10}};
}

function renderContent(overrides: Partial<ContentProps> = {}): ContentHandlers {
    const handlers: ContentHandlers = {
        onFileChange: vi.fn(), onGenerateTakenKeysChange: vi.fn(), onImport: vi.fn(),
        onClose: vi.fn(), onImportMore: vi.fn(), onRefreshLinks: vi.fn(),
    };
    render(<ImportCsvContent file={null} generateTakenKeys={false} isUploading={false} isDesktop session={null} {...handlers} {...overrides}/>);
    return handlers;
}

describe.each([
    ["desktop", true],
    ["mobile", false],
])("ImportCsvContent before an import starts on %s", (_viewport, isDesktop) => {
    it("shows the dropzone and keeps import disabled until a file is chosen", () => {
        renderContent({isDesktop});

        expect(screen.getByText(DROPZONE_HINT)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: IMPORT_LABEL})).toBeDisabled();
        expect(screen.getByRole("button", {name: CANCEL_LABEL})).toBeEnabled();
    });

    it("starts the import for the chosen file", async () => {
        const user = userEvent.setup();
        const {onImport} = renderContent({isDesktop, file: new File(["a"], "links.csv")});

        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));

        expect(onImport).toHaveBeenCalledOnce();
    });

    it("blocks cancelling and re-importing while the upload is in flight", () => {
        renderContent({isDesktop, file: new File(["a"], "links.csv"), isUploading: true});

        expect(screen.getByRole("button", {name: new RegExp(IMPORTING_LABEL)})).toBeDisabled();
        expect(screen.getByRole("button", {name: CANCEL_LABEL})).toBeDisabled();
    });

    it("closes through cancel", async () => {
        const user = userEvent.setup();
        const {onClose} = renderContent({isDesktop});

        await user.click(screen.getByRole("button", {name: CANCEL_LABEL}));

        expect(onClose).toHaveBeenCalledOnce();
    });
});

describe("ImportCsvContent generate-new-keys option", () => {
    it("toggles when the row is clicked", async () => {
        const user = userEvent.setup();
        const {onGenerateTakenKeysChange} = renderContent({generateTakenKeys: false});

        await user.click(screen.getByText(GENERATE_TAKEN_KEYS_LABEL));

        expect(onGenerateTakenKeysChange).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("toggles once when the switch itself is clicked", async () => {
        const user = userEvent.setup();
        const {onGenerateTakenKeysChange} = renderContent({generateTakenKeys: true});

        await user.click(screen.getByRole("switch"));

        expect(onGenerateTakenKeysChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("cannot be changed while uploading", async () => {
        const user = userEvent.setup();
        const {onGenerateTakenKeysChange} = renderContent({isUploading: true});

        await user.click(screen.getByText(GENERATE_TAKEN_KEYS_LABEL));

        expect(onGenerateTakenKeysChange).not.toHaveBeenCalled();
    });
});

describe("ImportCsvContent with an import session", () => {
    it("only offers to close while the import is processing", async () => {
        const user = userEvent.setup();
        const {onClose} = renderContent({session: createSession(IMPORT_SESSION_STATE.PROCESSING)});

        await user.click(screen.getByRole("button", {name: CLOSE_LABEL}));

        expect(screen.getByText(IMPORT_PROGRESS_TITLE)).toBeInTheDocument();
        expect(screen.queryByText(DROPZONE_HINT)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: IMPORT_MORE_LABEL})).not.toBeInTheDocument();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("offers another import and a done button once completed", async () => {
        const user = userEvent.setup();
        const {onImportMore, onClose} = renderContent({session: createSession(IMPORT_SESSION_STATE.COMPLETED)});

        await user.click(screen.getByRole("button", {name: IMPORT_MORE_LABEL}));
        await user.click(screen.getByRole("button", {name: DONE_LABEL}));

        expect(screen.getByText(IMPORT_PROCESSED_TITLE)).toBeInTheDocument();
        expect(onImportMore).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("refreshes links when progress updates were interrupted", async () => {
        const user = userEvent.setup();
        const {onRefreshLinks} = renderContent({session: createSession(IMPORT_SESSION_STATE.INTERRUPTED)});

        await user.click(screen.getByRole("button", {name: REFRESH_LINKS_LABEL}));

        expect(onRefreshLinks).toHaveBeenCalledOnce();
    });
});
