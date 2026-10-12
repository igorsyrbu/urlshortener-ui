import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import LinksPage from "./page";
import {
    DROPZONE_HINT,
    IMPORT_FROM_CSV_LABEL,
    IMPORT_PROCESSED_TITLE,
} from "@/components/links/import-export-constants";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {createImportJob} from "@/test/import-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

function openUpdatesStream(): void {
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stream = new ReadableStream<Uint8Array>({start(controller): void { streamController = controller; }});
    vi.mocked(fetchWithAuth).mockImplementationOnce(async (_endpoint, options) => {
        options?.signal?.addEventListener("abort", () => { streamController?.error(new DOMException("Aborted", "AbortError")); }, {once: true});
        return new Response(stream, {headers: {"Content-Type": "text/event-stream"}});
    });
}

describe("links page import entry", () => {
    beforeEach(() => { vi.clearAllMocks(); });
    afterEach(() => { resetImportTrackerForTests(); });

    it("opens a fresh import form instead of the previous completion screen", async () => {
        useImportTracker.setState({
            status: IMPORT_TRACKING_STATUS.COMPLETED,
            progress: {processedRows: 10, totalRows: 10},
            job: {...createImportJob(), status: "COMPLETED", processedRows: 10},
        });
        render(<LinksPage/>);
        fireEvent.click(screen.getAllByRole("button").find((button) => !button.getAttribute("aria-label")) as HTMLElement);
        fireEvent.click(await screen.findByRole("button", {name: IMPORT_FROM_CSV_LABEL}));
        expect(await screen.findByText(DROPZONE_HINT)).toBeInTheDocument();
        expect(screen.queryByText(IMPORT_PROCESSED_TITLE)).not.toBeInTheDocument();
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
    });

    it("closes the import stream when navigating away from links", () => {
        openUpdatesStream();
        act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
        const signal = vi.mocked(fetchWithAuth).mock.calls[0][1]?.signal;
        const {unmount} = render(<LinksPage/>);
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);
        unmount();
        expect(signal?.aborted).toBe(true);
        expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
        expect(useImportTracker.getState().progress).toBeNull();
    });
});
