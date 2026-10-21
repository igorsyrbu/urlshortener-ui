import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {BillingCurrentPlanCard} from "@/components/settings/BillingCurrentPlanCard";
import {BILLING_COPY, type BillingSubscription} from "@/lib/billing-constants";
import type {BillingPortalState} from "@/lib/hooks/useBillingPortal";

const PERIOD_END = "2027-03-15T12:00:00.000Z";
const FREE: BillingSubscription = {planId: "free", cancelAtPeriodEnd: false, pendingSwitch: null};
const PRO: BillingSubscription = {planId: "pro", currentPeriodEnd: PERIOD_END, cancelAtPeriodEnd: false, pendingSwitch: null};

function createPortal(overrides: Partial<BillingPortalState> = {}): BillingPortalState {
    return {isManaging: false, errorMessage: null, isCoolingDown: false, handleManage: vi.fn().mockResolvedValue(undefined), ...overrides};
}

function renderCard(subscription: BillingSubscription, portal = createPortal(), isLoading = false): BillingPortalState {
    render(<BillingCurrentPlanCard subscription={subscription} scheduledSwitch={null} portal={portal} isLoading={isLoading}/>);
    return portal;
}

describe("BillingCurrentPlanCard", () => {
    it("shows the Free plan with an upgrade note and no way to manage a subscription", () => {
        renderCard(FREE);

        expect(screen.getByText(BILLING_COPY.FREE_PLAN_NOTE)).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION})).not.toBeInTheDocument();
    });

    it("shows an active Pro plan with its renewal date and opens the portal on Manage", async () => {
        const user = userEvent.setup();
        const portal = renderCard(PRO);

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        expect(screen.getByText(BILLING_COPY.STATUS_ACTIVE)).toBeInTheDocument();
        expect(screen.getByText((content) => content.startsWith(BILLING_COPY.RENEWS_ON))).toBeInTheDocument();
        expect(portal.handleManage).toHaveBeenCalledOnce();
    });

    it("marks a plan that ends at renewal as canceling and names the end date", () => {
        renderCard({...PRO, cancelAtPeriodEnd: true});

        expect(screen.getByText(BILLING_COPY.STATUS_CANCELING)).toBeInTheDocument();
        expect(screen.getByText((content) => content.startsWith(BILLING_COPY.CANCELS_ON))).toBeInTheDocument();
    });

    it("marks a scheduled yearly switch as a pending change and says when it applies", () => {
        render(<BillingCurrentPlanCard subscription={PRO} scheduledSwitch={{effectiveDate: null}} portal={createPortal()} isLoading={false}/>);

        expect(screen.getByText(BILLING_COPY.STATUS_PENDING_CHANGE)).toBeInTheDocument();
        expect(screen.getByText(BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL)).toBeInTheDocument();
    });

    it("announces a portal failure", () => {
        renderCard(PRO, createPortal({errorMessage: BILLING_COPY.PORTAL_FAILED}));

        expect(screen.getByRole("alert")).toHaveTextContent(BILLING_COPY.PORTAL_FAILED);
    });

    it("shows progress while the portal opens", () => {
        renderCard(PRO, createPortal({isManaging: true}));

        expect(screen.getByRole("button", {name: BILLING_COPY.MANAGING_SUBSCRIPTION})).toBeDisabled();
    });

    it("shows no plan facts while the subscription is loading", () => {
        renderCard(PRO, createPortal(), true);

        expect(screen.queryByText(BILLING_COPY.STATUS_ACTIVE)).not.toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});
