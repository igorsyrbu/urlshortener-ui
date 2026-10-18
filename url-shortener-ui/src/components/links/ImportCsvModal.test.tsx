import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ImportCsvModal} from "@/components/links/ImportCsvModal";
import {
    CANCEL_LABEL,
    CLOSE_LABEL,
    DONE_LABEL,
    DROPZONE_ARIA_LABEL,
    DROPZONE_HINT,
    GENERATE_TAKEN_KEYS_LABEL,
    IMPORT_EMPTY_FILE_MESSAGE,
    IMPORT_LABEL,
    IMPORT_MODAL_TITLE,
    IMPORT_PROGRESS_TITLE,
} from "@/components/links/import-export-constants";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {createCsvFile} from "@/test/csv-utils";
import {createImportJob} from "@/test/import-utils";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("sonner", () => ({toast: {error: vi.fn(), success: vi.fn()}}));

const REJECTED_STATUS = 400;

function mockAcceptedJob(): ReadableStreamDefaultController<Uint8Array> {
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stream = new ReadableStream<Uint8Array>({start(controller): void { streamController = controller; }});
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createImportJob()));
    vi.mocked(fetchWithAuth).mockImplementationOnce(async (_endpoint, options) => {
        options?.signal?.addEventListener("abort", () => { streamController?.error(new DOMException("Aborted", "AbortError")); }, {once: true});
        return new Response(stream, {headers: {"Content-Type": "text/event-stream"}});
    });
    if (!streamController) throw new Error("Stream controller was not initialized");
    return streamController;
}

function sendProgress(controller: ReadableStreamDefaultController<Uint8Array>, processedRows: number): void {
    controller.enqueue(new TextEncoder().encode(`event: progress\ndata: ${JSON.stringify({processedRows, totalRows: 10})}\n\n`));
}

function renderModal(open = true): {onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>} {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<ImportCsvModal open={open} onOpenChange={onOpenChange}/>);
    return {onOpenChange};
}

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file: File = createCsvFile()): Promise<void> {
    await user.upload(screen.getByLabelText(DROPZONE_ARIA_LABEL), file);
}

function getPostRequests(): Array<Parameters<typeof fetchWithAuth>> {
    return vi.mocked(fetchWithAuth).mock.calls.filter(([, options]) => options?.method === "POST");
}

describe.each([
    ["desktop", true],
    ["mobile", false],
])("ImportCsvModal on %s", (_viewport, isDesktop) => {
    beforeEach(() => {
        media.isDesktop = isDesktop;
        resetImportTrackerForTests();
    });
    afterEach(() => { resetImportTrackerForTests(); });

    it("shows nothing while closed", () => {
        renderModal(false);

        expect(screen.queryByText(DROPZONE_HINT)).not.toBeInTheDocument();
    });

    it("presents the import form when opened", () => {
        renderModal();

        expect(screen.getByRole("dialog", {name: IMPORT_MODAL_TITLE})).toBeInTheDocument();
        expect(screen.getByText(DROPZONE_HINT)).toBeInTheDocument();
    });

    it("orders the actions the way its container expects: Cancel then Import in a dialog, Import first in a drawer", () => {
        renderModal();

        const actionNames = screen.getAllByRole("button")
            .map((button) => button.textContent?.trim())
            .filter((name) => name === CANCEL_LABEL || name === IMPORT_LABEL);

        expect(actionNames).toEqual(isDesktop ? [CANCEL_LABEL, IMPORT_LABEL] : [IMPORT_LABEL, CANCEL_LABEL]);
    });

    it("uploads the chosen file and switches to the progress view", async () => {
        const user = userEvent.setup();
        mockAcceptedJob();
        renderModal();

        await chooseFile(user, createCsvFile({name: "my-links.csv", content: "Destination URL\nhttps://a.example"}));
        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));

        expect(await screen.findByText(IMPORT_PROGRESS_TITLE)).toBeInTheDocument();
        const [[endpoint, request]] = getPostRequests();
        expect(endpoint).toBe(`${API_ENDPOINTS.SHORTLINKS_IMPORT}?fileName=my-links.csv`);
        expect(request?.body).toBe("Destination URL\nhttps://a.example");
    });
});

describe("ImportCsvModal import options and failures", () => {
    beforeEach(() => {
        media.isDesktop = true;
        resetImportTrackerForTests();
    });
    afterEach(() => { resetImportTrackerForTests(); });

    it("asks the server to generate new keys for taken ones when the option is enabled", async () => {
        const user = userEvent.setup();
        mockAcceptedJob();
        renderModal();

        await chooseFile(user);
        await user.click(screen.getByText(GENERATE_TAKEN_KEYS_LABEL));
        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));

        await screen.findByText(IMPORT_PROGRESS_TITLE);
        const [[endpoint]] = getPostRequests();
        expect(endpoint).toContain("generateTakenKeys=true");
    });

    it("rejects an empty file without calling the server", async () => {
        const user = userEvent.setup();
        vi.spyOn(logger, "error").mockImplementation(() => undefined);
        renderModal();

        await chooseFile(user, createCsvFile({content: ""}));
        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(IMPORT_EMPTY_FILE_MESSAGE));
        expect(getPostRequests()).toHaveLength(0);
        expect(screen.getByRole("button", {name: IMPORT_LABEL})).toBeEnabled();
    });

    it("tells the user why the server rejected the upload and lets them retry", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({detail: "CSV is malformed"}, {status: REJECTED_STATUS}));
        renderModal();

        await chooseFile(user);
        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("CSV is malformed")));
        expect(screen.getByRole("button", {name: IMPORT_LABEL})).toBeEnabled();
    });

    it("closes through cancel before any upload", async () => {
        const user = userEvent.setup();
        const {onOpenChange} = renderModal();

        await user.click(screen.getByRole("button", {name: CANCEL_LABEL}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("lets the user close the dialog while the import keeps running in the background", async () => {
        const user = userEvent.setup();
        mockAcceptedJob();
        const {onOpenChange} = renderModal();
        await chooseFile(user);
        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));

        await screen.findByText(IMPORT_PROGRESS_TITLE);
        const [footerCloseButton] = screen.getAllByRole("button", {name: CLOSE_LABEL});
        await user.click(footerCloseButton);

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
    });

    it("clears the finished import when the user presses done", async () => {
        const user = userEvent.setup();
        const controller = mockAcceptedJob();
        const {onOpenChange} = renderModal();
        await chooseFile(user);
        await user.click(screen.getByRole("button", {name: IMPORT_LABEL}));
        await screen.findByText(IMPORT_PROGRESS_TITLE);

        sendProgress(controller, 10);
        await user.click(await screen.findByRole("button", {name: DONE_LABEL}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
    });
});
