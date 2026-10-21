import type {ReactElement} from "react";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TagFormModal} from "@/components/tags/TagFormModal";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";

const mediaQuery = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => mediaQuery.isDesktop,
    useIsMobile: () => !mediaQuery.isDesktop,
}));

const SUBMIT_LABEL = "Create";
const SUBMITTING_LABEL = "Creating...";

interface RenderOptions {
    onSubmit?: (name: string, color: string) => void | Promise<unknown>;
    initialName?: string;
    initialColor?: (typeof ALLOWED_TAG_COLORS)[number];
    resetOnClose?: boolean;
}

interface RenderedModal {
    onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;
    rerenderOpen: (open: boolean) => void;
}

function renderModal(options: RenderOptions = {}): RenderedModal {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const buildModal = (open: boolean): ReactElement => (
        <TagFormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Create Tag"
            submitLabel={SUBMIT_LABEL}
            submittingLabel={SUBMITTING_LABEL}
            onSubmit={options.onSubmit ?? vi.fn()}
            initialName={options.initialName}
            initialColor={options.initialColor}
            resetOnClose={options.resetOnClose}
        />
    );
    const {rerender} = render(buildModal(true));
    return {onOpenChange, rerenderOpen: (open) => rerender(buildModal(open))};
}

function getNameInput(): HTMLElement {
    return screen.getByLabelText("Name");
}

function getSubmitButton(): HTMLElement {
    return screen.getByRole("button", {name: new RegExp(`^${SUBMIT_LABEL}`)});
}

describe.each([
    {layout: "desktop dialog", isDesktop: true},
    {layout: "mobile drawer", isDesktop: false},
])("TagFormModal in $layout", ({isDesktop}) => {
    beforeEach(() => {
        mediaQuery.isDesktop = isDesktop;
    });

    it("disables submit while the name is empty or only whitespace", async () => {
        const user = userEvent.setup();
        renderModal();

        expect(getSubmitButton()).toBeDisabled();
        await user.type(getNameInput(), "   ");

        expect(getSubmitButton()).toBeDisabled();
    });

    it("submits the trimmed name with the default first color", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        renderModal({onSubmit});

        await user.type(getNameInput(), "  Marketing  ");
        await user.click(getSubmitButton());

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Marketing", ALLOWED_TAG_COLORS[0]);
    });

    it("submits the color picked by the user", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        renderModal({onSubmit});

        await user.type(getNameInput(), "Sales");
        await user.click(screen.getByRole("radio", {name: "Purple"}));
        await user.click(getSubmitButton());

        expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Sales", "purple");
    });

    it("closes the modal after a successful submit", async () => {
        const user = userEvent.setup();
        const {onOpenChange} = renderModal();

        await user.type(getNameInput(), "Sales");
        await user.click(getSubmitButton());

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("keeps the modal open and re-enables the form when the submit fails", async () => {
        const user = userEvent.setup();
        const {onOpenChange} = renderModal({onSubmit: vi.fn().mockRejectedValue(new Error("duplicate"))});

        await user.type(getNameInput(), "Sales");
        await user.click(getSubmitButton());

        expect(onOpenChange).not.toHaveBeenCalled();
        expect(getSubmitButton()).toBeEnabled();
    });

    it("shows the submitting label and disables actions while the request is pending", async () => {
        const user = userEvent.setup();
        renderModal({onSubmit: vi.fn(() => new Promise(() => undefined))});

        await user.type(getNameInput(), "Sales");
        await user.click(getSubmitButton());

        expect(screen.getByRole("button", {name: SUBMITTING_LABEL})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeDisabled();
    });

    it("prefills the name from the initial value", () => {
        renderModal({initialName: "Existing", initialColor: "cyan"});

        expect(getNameInput()).toHaveValue("Existing");
    });

    it("limits the name length to 50 characters", () => {
        renderModal();

        expect(getNameInput()).toHaveAttribute("maxLength", "50");
    });

    it("closes through Cancel without submitting", async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();
        const {onOpenChange} = renderModal({onSubmit});

        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("clears the typed name on cancel when resetOnClose is set", async () => {
        const user = userEvent.setup();
        const {rerenderOpen} = renderModal({resetOnClose: true});

        await user.type(getNameInput(), "Draft");
        await user.click(screen.getByRole("button", {name: "Cancel"}));
        rerenderOpen(false);
        rerenderOpen(true);

        expect(getNameInput()).toHaveValue("");
    });

    it("restores the initial values when reopened without resetOnClose", async () => {
        const user = userEvent.setup();
        const {rerenderOpen} = renderModal({initialName: "Existing"});

        await user.clear(getNameInput());
        await user.type(getNameInput(), "Changed");
        rerenderOpen(false);
        rerenderOpen(true);

        expect(getNameInput()).toHaveValue("Existing");
    });
});
