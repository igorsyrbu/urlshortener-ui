import type {ReactElement} from "react";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import {DeleteConfirmationModal} from "@/components/ui/delete-confirmation-modal";
import {COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import {logger} from "@/lib/logger";

const mediaQuery = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => mediaQuery.isDesktop,
    useIsMobile: () => !mediaQuery.isDesktop,
}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const CONFIRMATION_VALUE = "my-tag";

interface RenderOptions {
    loading?: boolean;
    confirmationValue?: string;
    confirmationType?: string;
    open?: boolean;
}

interface RenderedModal {
    onConfirm: Mock;
    onOpenChange: Mock;
    rerenderOpen: (open: boolean) => void;
}

function renderModal(options: RenderOptions = {}): RenderedModal {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const buildModal = (open: boolean): ReactElement => (
        <DeleteConfirmationModal
            open={open}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            loading={options.loading ?? false}
            title="Delete this?"
            description="This cannot be undone."
            confirmationValue={options.confirmationValue}
            confirmationType={options.confirmationType}
        />
    );
    const {rerender} = render(buildModal(options.open ?? true));
    return {onConfirm, onOpenChange, rerenderOpen: (open) => rerender(buildModal(open))};
}

describe.each([
    {layout: "desktop dialog", isDesktop: true},
    {layout: "mobile drawer", isDesktop: false},
])("DeleteConfirmationModal in $layout", ({isDesktop}) => {
    beforeEach(() => {
        mediaQuery.isDesktop = isDesktop;
    });

    it("shows the title and description", () => {
        renderModal();

        expect(screen.getByText("Delete this?")).toBeInTheDocument();
        expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    });

    it("confirms immediately when no confirmation value is required", async () => {
        const user = userEvent.setup();
        const {onConfirm} = renderModal();

        await user.click(screen.getByRole("button", {name: "Delete"}));

        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("keeps confirm disabled until the exact confirmation value is typed", async () => {
        const user = userEvent.setup();
        renderModal({confirmationValue: CONFIRMATION_VALUE});
        const input = screen.getByRole("textbox");

        await user.type(input, "my-ta");
        expect(screen.getByRole("button", {name: "Delete"})).toBeDisabled();

        await user.type(input, "g");
        expect(screen.getByRole("button", {name: "Delete"})).toBeEnabled();
    });

    it("treats the confirmation as case sensitive", async () => {
        const user = userEvent.setup();
        renderModal({confirmationValue: CONFIRMATION_VALUE});

        await user.type(screen.getByRole("textbox"), "MY-TAG");

        expect(screen.getByRole("button", {name: "Delete"})).toBeDisabled();
    });

    it("names the confirmation type in the input placeholder", () => {
        renderModal({confirmationValue: CONFIRMATION_VALUE, confirmationType: "tag name"});

        expect(screen.getByPlaceholderText("Type the tag name here")).toBeInTheDocument();
    });

    it("falls back to a generic placeholder without a confirmation type", () => {
        renderModal({confirmationValue: CONFIRMATION_VALUE});

        expect(screen.getByPlaceholderText("Type the value here")).toBeInTheDocument();
    });

    it("clears the typed confirmation when the modal is closed and reopened", async () => {
        const user = userEvent.setup();
        const {rerenderOpen} = renderModal({confirmationValue: CONFIRMATION_VALUE});

        await user.type(screen.getByRole("textbox"), CONFIRMATION_VALUE);
        rerenderOpen(false);
        rerenderOpen(true);

        expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("shows the loading label and disables every control while loading", () => {
        renderModal({loading: true, confirmationValue: CONFIRMATION_VALUE});

        expect(screen.getByRole("button", {name: "Deleting..."})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
        expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("closes through Cancel without confirming", async () => {
        const user = userEvent.setup();
        const {onConfirm, onOpenChange} = renderModal();

        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("renders nothing while closed", () => {
        renderModal({open: false});

        expect(screen.queryByText("Delete this?")).not.toBeInTheDocument();
    });
});

describe("DeleteConfirmationModal copy to clipboard", () => {
    beforeEach(() => {
        mediaQuery.isDesktop = true;
        vi.useFakeTimers({shouldAdvanceTime: true});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("copies the confirmation value and shows feedback for a short while", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        renderModal({confirmationValue: CONFIRMATION_VALUE});
        const copyButton = screen.getByTitle("Copy to clipboard");

        await user.click(copyButton);

        expect(await navigator.clipboard.readText()).toBe(CONFIRMATION_VALUE);
        expect(copyButton.querySelector("svg.text-success")).not.toBeNull();
        act(() => {
            vi.advanceTimersByTime(COPY_FEEDBACK_DURATION_MS);
        });
        expect(copyButton.querySelector("svg.text-success")).toBeNull();
    });

    it("logs an error and shows no feedback when copying fails", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        renderModal({confirmationValue: CONFIRMATION_VALUE});
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
        const copyButton = screen.getByTitle("Copy to clipboard");

        await user.click(copyButton);

        expect(logger.error).toHaveBeenCalledOnce();
        expect(copyButton.querySelector("svg.text-success")).toBeNull();
    });
});
