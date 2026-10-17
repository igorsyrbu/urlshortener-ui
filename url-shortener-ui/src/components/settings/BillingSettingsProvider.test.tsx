import {render, renderHook, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {BillingSettingsProvider, useBillingSettings} from "@/components/settings/BillingSettingsProvider";
import {BillingSettings} from "@/components/settings/BillingSettings";
import {API_ENDPOINTS} from "@/lib/constants";
import {BILLING_COPY, BILLING_PRICES} from "@/lib/billing-constants";
import {SETTINGS_LABELS} from "@/lib/settings-constants";
import {routeFetchWithAuth} from "@/test/link-form-utils";
import {stubDesktopViewport} from "@/test/viewport-utils";
import {createBillingSubscriptionDto, allowTestBillingOrigins} from "@/test/billing-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const FUTURE_PERIOD_END = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const FREE_SUBSCRIPTION = {plan: "FREE", cancelAtPeriodEnd: false};
const PRO_SUBSCRIPTION = createBillingSubscriptionDto({currentPeriodEnd: FUTURE_PERIOD_END});

function mockSubscription(payload: unknown): void {
    routeFetchWithAuth({
        [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(payload),
        [API_ENDPOINTS.BILLING_CHECKOUT]: () => Response.json({url: "https://buy.polar.sh/checkout/test"}),
        [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: "https://billing.polar.sh/portal/test"}),
    });
}

beforeEach(() => {
    allowTestBillingOrigins();
});

describe("BillingSettingsProvider", () => {
    beforeEach(stubDesktopViewport);

    it("keeps the selected billing cycle when its page is unmounted and revisited", async () => {
        mockSubscription(FREE_SUBSCRIPTION);
        const user = userEvent.setup();
        const {rerender} = render(<BillingSettingsProvider><BillingSettings/></BillingSettingsProvider>);
        await screen.findByRole("region", {name: "Free plan"});
        await user.click(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`}));

        rerender(<BillingSettingsProvider><p>{SETTINGS_LABELS.GENERAL}</p></BillingSettingsProvider>);
        rerender(<BillingSettingsProvider><BillingSettings/></BillingSettingsProvider>);

        expect(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("status", {name: BILLING_PRICES.yearly.monthlyPrice})).toBeInTheDocument();
    });

    it("keeps the Pro subscription when its page is unmounted and revisited", async () => {
        mockSubscription(PRO_SUBSCRIPTION);
        const {rerender} = render(<BillingSettingsProvider><BillingSettings/></BillingSettingsProvider>);
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        rerender(<BillingSettingsProvider><p>{SETTINGS_LABELS.GENERAL}</p></BillingSettingsProvider>);
        rerender(<BillingSettingsProvider><BillingSettings/></BillingSettingsProvider>);

        expect(within(screen.getByRole("region", {name: "Pro plan"})).getByRole("button", {name: BILLING_COPY.CURRENT_PLAN})).toBeDisabled();
        expect(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION})).toBeInTheDocument();
    });

    it("rejects consuming billing settings outside their provider", () => {
        expect(() => renderHook(useBillingSettings)).toThrow(Error);
    });
});
