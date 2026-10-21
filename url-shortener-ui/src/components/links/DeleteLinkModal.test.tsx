import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DeleteLinkModal} from "@/components/links/DeleteLinkModal";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));

const SHORT_URL = "https://sho.rt/promo-2026";
const LONG_URL = "https://example.com/very/long/destination";
const HANDLE = "promo-2026";
const HANDLE_PLACEHOLDER = "Type the short link handle here";

interface DeleteHandlers {
    onConfirm: ReturnType<typeof vi.fn<() => void>>;
    onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;
}

function renderDeleteModal(overrides: Partial<Parameters<typeof DeleteLinkModal>[0]> = {}): DeleteHandlers {
    const handlers: DeleteHandlers = {onConfirm: vi.fn(), onOpenChange: vi.fn()};
    render(<DeleteLinkModal open loading={false} shortUrl={SHORT_URL} longUrl={LONG_URL} {...handlers} {...overrides}/>);
    return handlers;
}

describe.each([
    ["desktop", true],
    ["mobile", false],
])("DeleteLinkModal on %s", (_viewport, isDesktop) => {
    beforeEach(() => { media.isDesktop = isDesktop; });

    it("describes the consequences and previews the link being deleted", () => {
        renderDeleteModal();

        expect(screen.getByText("Delete this link?")).toBeInTheDocument();
        expect(screen.getByText(/remove all of its analytics/)).toBeInTheDocument();
        expect(screen.getByText(SHORT_URL)).toBeInTheDocument();
        expect(screen.getByText(LONG_URL)).toBeInTheDocument();
    });

    it("exposes very long addresses as tooltips so they can be truncated", () => {
        const long = "x".repeat(300);
        renderDeleteModal({shortUrl: `https://sho.rt/${long}`, longUrl: `https://example.com/${long}`});

        expect(screen.getByText(`https://sho.rt/${long}`)).toHaveAttribute("title", `https://sho.rt/${long}`);
        expect(screen.getByText(`https://example.com/${long}`)).toHaveAttribute("title", `https://example.com/${long}`);
    });

    it("requires typing the short link handle before deleting", async () => {
        const user = userEvent.setup();
        const {onConfirm} = renderDeleteModal();
        const confirmButton = screen.getByRole("button", {name: "Delete link"});

        expect(confirmButton).toBeDisabled();
        await user.type(screen.getByPlaceholderText(HANDLE_PLACEHOLDER), "promo");
        expect(confirmButton).toBeDisabled();
        await user.type(screen.getByPlaceholderText(HANDLE_PLACEHOLDER), "-2026");
        expect(confirmButton).toBeEnabled();
        await user.click(confirmButton);

        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("treats the handle as case sensitive", async () => {
        const user = userEvent.setup();
        renderDeleteModal();

        await user.type(screen.getByPlaceholderText(HANDLE_PLACEHOLDER), HANDLE.toUpperCase());

        expect(screen.getByRole("button", {name: "Delete link"})).toBeDisabled();
    });

    it("copies the handle to the clipboard", async () => {
        const user = userEvent.setup();
        renderDeleteModal();

        await user.click(screen.getByRole("button", {name: "Copy to clipboard"}));

        expect(await navigator.clipboard.readText()).toBe(HANDLE);
    });

    it("shows the deleting state and blocks every action while loading", () => {
        renderDeleteModal({loading: true});

        expect(screen.getByRole("button", {name: "Deleting..."})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
        expect(screen.getByPlaceholderText(HANDLE_PLACEHOLDER)).toBeDisabled();
    });

    it("cancels without confirming", async () => {
        const user = userEvent.setup();
        const {onConfirm, onOpenChange} = renderDeleteModal();

        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("asks for no confirmation when the link is unknown", () => {
        renderDeleteModal({shortUrl: undefined, longUrl: undefined});

        expect(screen.queryByPlaceholderText(HANDLE_PLACEHOLDER)).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Delete link"})).toBeEnabled();
    });
});

describe("DeleteLinkModal confirmation reset", () => {
    beforeEach(() => { media.isDesktop = true; });

    it("clears the typed handle after the dialog is closed and reopened", async () => {
        const user = userEvent.setup();
        const props = {onConfirm: vi.fn(), onOpenChange: vi.fn(), loading: false, shortUrl: SHORT_URL, longUrl: LONG_URL};
        const {rerender} = render(<DeleteLinkModal open {...props}/>);
        await user.type(screen.getByPlaceholderText(HANDLE_PLACEHOLDER), HANDLE);

        rerender(<DeleteLinkModal open={false} {...props}/>);
        rerender(<DeleteLinkModal open {...props}/>);

        expect(screen.getByPlaceholderText(HANDLE_PLACEHOLDER)).toHaveValue("");
    });
});
