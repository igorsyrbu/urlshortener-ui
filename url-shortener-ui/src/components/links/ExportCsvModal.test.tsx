import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ExportCsvModal} from "@/components/links/ExportCsvModal";
import {
    CANCEL_LABEL,
    EXPORT_FAILED_MESSAGE,
    EXPORT_LABEL,
    EXPORT_RATE_LIMITED_MESSAGE,
    EXPORT_SUCCESS_MESSAGE,
    EXPORTING_LABEL,
    INCLUDE_FILTERS_LABEL,
} from "@/components/links/import-export-constants";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, EXPORT_FILENAME_PREFIX, EXPORT_RATE_LIMIT_RETRY_DELAY_MS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useLinkStore} from "@/lib/store/links";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("sonner", () => ({toast: {error: vi.fn(), success: vi.fn()}}));

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;
const CSV_BODY = "Short link,Destination URL\nabc,https://example.com";

function csvResponse(): Response {
    return new Response(CSV_BODY, {headers: {"Content-Type": "text/csv"}});
}

function getRequestedExportUrl(callIndex = 0): URL {
    const [endpoint] = vi.mocked(fetchWithAuth).mock.calls[callIndex];
    return new URL(endpoint, "http://localhost");
}

function renderModal(): {onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>} {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<ExportCsvModal open onOpenChange={onOpenChange}/>);
    return {onOpenChange};
}

function pressExport(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    return user.click(screen.getByRole("button", {name: EXPORT_LABEL}));
}

describe.each([
    ["desktop", true],
    ["mobile", false],
])("ExportCsvModal on %s", (_viewport, isDesktop) => {
    let downloadedFileNames: string[];

    beforeEach(() => {
        media.isDesktop = isDesktop;
        downloadedFileNames = [];
        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
            downloadedFileNames.push(this.download);
        });
        useLinkStore.setState({showArchived: true, searchQuery: "  promo  "});
    });

    afterEach(() => { vi.useRealTimers(); });

    it("exports the links matching the current filters, downloads the file and closes", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValue(csvResponse());
        const {onOpenChange} = renderModal();

        await pressExport(user);

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
        const requestedUrl = getRequestedExportUrl();
        expect(requestedUrl.pathname).toBe(API_ENDPOINTS.SHORTLINKS_EXPORT);
        expect(requestedUrl.searchParams.get("showArchived")).toBe("true");
        expect(requestedUrl.searchParams.get("search")).toBe("promo");
        expect(downloadedFileNames).toHaveLength(1);
        expect(downloadedFileNames[0]).toMatch(new RegExp(`^${EXPORT_FILENAME_PREFIX}-\\d{4}-\\d{2}-\\d{2}\\.csv$`));
        expect(toast.success).toHaveBeenCalledWith(EXPORT_SUCCESS_MESSAGE);
    });

    it("exports every non-archived link when filters are turned off", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValue(csvResponse());
        renderModal();

        await user.click(screen.getByText(INCLUDE_FILTERS_LABEL));
        await pressExport(user);

        await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
        const requestedUrl = getRequestedExportUrl();
        expect(requestedUrl.searchParams.get("showArchived")).toBe("false");
        expect(requestedUrl.searchParams.has("search")).toBe(false);
    });

    it("shows the exporting state and blocks every action while the request is pending", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => undefined));
        renderModal();

        await pressExport(user);

        expect(await screen.findByRole("button", {name: new RegExp(EXPORTING_LABEL)})).toBeDisabled();
        expect(screen.getByRole("button", {name: CANCEL_LABEL})).toBeDisabled();
    });

    it("explains why the export failed when the server sends a reason", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json({detail: "Too many links"}, {status: HTTP_SERVER_ERROR}));
        const {onOpenChange} = renderModal();

        await pressExport(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Too many links"));
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(screen.getByRole("button", {name: EXPORT_LABEL})).toBeEnabled();
    });

    it("reports a generic failure when the request itself fails", async () => {
        const user = userEvent.setup();
        const networkError = new Error("offline");
        vi.mocked(fetchWithAuth).mockRejectedValue(networkError);
        const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);
        renderModal();

        await pressExport(user);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(EXPORT_FAILED_MESSAGE));
        expect(logError).toHaveBeenCalledWith("Error exporting links to CSV", networkError);
    });

    it("retries once after a rate limit and succeeds", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(new Response(null, {status: HTTP_TOO_MANY_REQUESTS}))
            .mockResolvedValueOnce(csvResponse());
        renderModal();

        await pressExport(user);
        await act(() => vi.advanceTimersByTimeAsync(EXPORT_RATE_LIMIT_RETRY_DELAY_MS));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith(EXPORT_SUCCESS_MESSAGE));
        expect(fetchWithAuth).toHaveBeenCalledTimes(2);
    });

    it("tells the user to wait when the retry is rate limited too", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        vi.mocked(fetchWithAuth).mockImplementation(async () => new Response(null, {status: HTTP_TOO_MANY_REQUESTS}));
        vi.spyOn(logger, "error").mockImplementation(() => undefined);
        renderModal();

        await pressExport(user);
        await act(() => vi.advanceTimersByTimeAsync(EXPORT_RATE_LIMIT_RETRY_DELAY_MS));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(EXPORT_RATE_LIMITED_MESSAGE));
    });

    it("closes through cancel without exporting", async () => {
        const user = userEvent.setup();
        const {onOpenChange} = renderModal();

        await user.click(screen.getByRole("button", {name: CANCEL_LABEL}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(fetchWithAuth).not.toHaveBeenCalled();
    });
});
