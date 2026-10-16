import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import {PeriodSwitchConfirmModal} from "@/components/settings/PeriodSwitchConfirmModal";
import {BILLING_COPY} from "@/lib/billing-constants";

const mediaQuery = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => mediaQuery.isDesktop,
    useIsMobile: () => !mediaQuery.isDesktop,
}));

interface RenderedModal {
    onConfirm: Mock;
    onOpenChange: Mock;
}

function renderModal(): RenderedModal {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<PeriodSwitchConfirmModal open={true} onOpenChange={onOpenChange} onConfirm={onConfirm}/>);
    return {onConfirm, onOpenChange};
}

describe.each([
    {layout: "desktop dialog", isDesktop: true},
    {layout: "mobile drawer", isDesktop: false},
])("PeriodSwitchConfirmModal in $layout", ({isDesktop}) => {
    beforeEach(() => {
        mediaQuery.isDesktop = isDesktop;
    });

    it("shows the title, description, and manage-subscription note", () => {
        renderModal();

        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_TITLE)).toBeInTheDocument();
        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_DESCRIPTION)).toBeInTheDocument();
        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_NOTE)).toBeInTheDocument();
    });

    it("confirms the switch", async () => {
        const user = userEvent.setup();
        const {onConfirm} = renderModal();

        await user.click(screen.getByRole("button", {name: BILLING_COPY.SWITCH_CONFIRM_BUTTON}));

        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("cancels without confirming", async () => {
        const user = userEvent.setup();
        const {onConfirm, onOpenChange} = renderModal();

        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
