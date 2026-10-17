import {render, screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {BillingPlanCard} from "@/components/settings/BillingPlanCard";
import {BILLING_COPY, BILLING_PRICES, type BillingPlan} from "@/lib/billing-constants";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

const LONG_TEXT_LENGTH = 250;
const LONG_NAME = "n".repeat(LONG_TEXT_LENGTH);
const LONG_FEATURE = "f".repeat(LONG_TEXT_LENGTH);

describe.each([
    {layout: "desktop", stubViewport: stubDesktopViewport},
    {layout: "mobile", stubViewport: stubMobileViewport},
])("BillingPlanCard $layout content", ({stubViewport}) => {
    it("exposes a long plan name in full and renders long feature text", () => {
        stubViewport();
        const plan: BillingPlan = {id: "pro", name: LONG_NAME, description: LONG_FEATURE, features: [LONG_FEATURE]};

        render(<BillingPlanCard plan={plan} cycle="monthly" isCurrent={false} isUpgrading={false} isPeriodSwitchable={false} isSchedulingPeriod={false} onUpgrade={() => undefined}/>);

        expect(screen.getByRole("heading", {name: LONG_NAME})).toHaveAttribute("title", LONG_NAME);
        expect(within(screen.getByRole("list")).getByText(LONG_FEATURE)).toBeInTheDocument();
    });

    it("renders a plan with no optional description or features", () => {
        stubViewport();
        const plan: BillingPlan = {id: "pro", name: "Pro", features: []};

        render(<BillingPlanCard plan={plan} cycle="monthly" isCurrent={false} isUpgrading={false} isPeriodSwitchable={false} isSchedulingPeriod={false} onUpgrade={() => undefined}/>);

        expect(screen.getByRole("heading", {name: plan.name})).toBeInTheDocument();
        expect(within(screen.getByRole("list")).queryByRole("listitem")).not.toBeInTheDocument();
    });

    it("disables the upgrade button and announces redirecting while the checkout is pending", () => {
        stubViewport();
        const plan: BillingPlan = {id: "pro", name: "Pro", features: []};
        const onUpgrade = vi.fn<() => void>();

        render(<BillingPlanCard plan={plan} cycle="monthly" isCurrent={false} isUpgrading isPeriodSwitchable={false} isSchedulingPeriod={false} onUpgrade={onUpgrade}/>);

        expect(screen.getByRole("button", {name: BILLING_COPY.UPGRADING})).toBeDisabled();
    });

    it("enables the period switch while keeping the current plan badge", () => {
        stubViewport();
        const plan: BillingPlan = {id: "pro", name: "Pro", features: []};
        const onUpgrade = vi.fn<() => void>();

        render(<BillingPlanCard plan={plan} cycle="yearly" isCurrent isUpgrading={false} isPeriodSwitchable isSchedulingPeriod={false} onUpgrade={onUpgrade}/>);

        expect(screen.getByRole("button", {name: BILLING_COPY.SWITCH_TO_YEARLY})).toBeEnabled();
        expect(screen.getByText(BILLING_COPY.CURRENT_PLAN)).toBeInTheDocument();
    });

    it("disables the period switch and announces scheduling while the request is pending", () => {
        stubViewport();
        const plan: BillingPlan = {id: "pro", name: "Pro", features: []};
        const onUpgrade = vi.fn<() => void>();

        render(<BillingPlanCard plan={plan} cycle="yearly" isCurrent isUpgrading={false} isPeriodSwitchable isSchedulingPeriod onUpgrade={onUpgrade}/>);

        expect(screen.getByRole("button", {name: BILLING_COPY.SWITCHING_PERIOD})).toBeDisabled();
    });

    it("shows the plan's price and features but holds the action and the current badge while loading", () => {
        stubViewport();
        const plan: BillingPlan = {id: "pro", name: "Pro", features: ["Custom domains"]};

        render(<BillingPlanCard plan={plan} cycle="monthly" isCurrent isUpgrading={false} isPeriodSwitchable={false} isSchedulingPeriod={false} onUpgrade={() => undefined} isLoading/>);

        expect(screen.getByRole("status", {name: BILLING_PRICES.monthly.monthlyPrice})).toBeInTheDocument();
        expect(screen.getByText("Custom domains")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByText(BILLING_COPY.CURRENT_PLAN)).not.toBeInTheDocument();
    });
});
