import {createEvent, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {BillingSettings} from "@/components/settings/BillingSettings";
import {BillingSettingsProvider} from "@/components/settings/BillingSettingsProvider";
import * as billingRedirect from "@/lib/billing-redirect";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {BILLING_COPY, BILLING_PLANS, BILLING_PRICES, RATE_LIMIT_RETRY_AFTER_HEADER, type BillingCycle} from "@/lib/billing-constants";
import {logger} from "@/lib/logger";
import {getRequestsTo, parseRequestBody, routeFetchWithAuth} from "@/test/link-form-utils";
import {markPortalOpened} from "@/lib/billing-portal-return";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";
import {createBillingSubscriptionDto, allowTestBillingOrigins} from "@/test/billing-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const CHECKOUT_URL = "https://buy.polar.sh/checkout/test";
const PORTAL_URL = "https://billing.polar.sh/portal/test";
const FUTURE_PERIOD_END = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const PORTAL_TTL_SECONDS = 60 * 60;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const FREE_SUBSCRIPTION = {plan: "FREE", cancelAtPeriodEnd: false};
const PRO_SUBSCRIPTION = createBillingSubscriptionDto({currentPeriodEnd: FUTURE_PERIOD_END});

function mockBillingRedirect(): void {
    vi.spyOn(billingRedirect, "redirectToBillingUrl").mockImplementation(() => undefined);
    vi.spyOn(billingRedirect, "openBlankBillingTab").mockReturnValue(null);
    vi.spyOn(billingRedirect, "showBillingUrlInTab").mockImplementation(() => undefined);
}

function redirectedUrls(): string[] {
    return vi.mocked(billingRedirect.redirectToBillingUrl).mock.calls.map(([url]) => url);
}

function portalOpenedUrls(): string[] {
    return vi.mocked(billingRedirect.showBillingUrlInTab).mock.calls.map(([, url]) => url);
}

function mockFreeBilling(): void {
    routeFetchWithAuth({
        [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(FREE_SUBSCRIPTION),
        [API_ENDPOINTS.BILLING_CHECKOUT]: () => Response.json({url: CHECKOUT_URL}),
        [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL}),
    });
}

function renderBilling(): ReturnType<typeof userEvent.setup> {
    render(<BillingSettingsProvider><BillingSettings/></BillingSettingsProvider>);
    return userEvent.setup();
}

async function renderFreeBilling(): Promise<ReturnType<typeof userEvent.setup>> {
    mockFreeBilling();
    const user = renderBilling();

    await screen.findByRole("region", {name: "Free plan"});
    return user;
}

function proPlan(): HTMLElement {
    return screen.getByRole("region", {name: "Pro plan"});
}

async function clickUpgrade(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", {name: BILLING_COPY.UPGRADE}));
}

const BILLING_CYCLES: BillingCycle[] = ["monthly", "yearly"];

beforeEach(() => {
    allowTestBillingOrigins();
});

describe("BillingSettings plans", () => {
    beforeEach(() => {
        stubDesktopViewport();
        mockBillingRedirect();
    });

    it("shows both plans with their prices but no plan actions while the subscription loads", () => {
        routeFetchWithAuth({[API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => new Promise<Response>(() => {})});
        renderBilling();

        expect(screen.getByRole("status", {name: BILLING_COPY.SUBSCRIPTION_LOADING})).toBeInTheDocument();
        for (const plan of BILLING_PLANS) {
            const planCard = screen.getByRole("region", {name: `${plan.name} plan`});
            expect(within(planCard).queryByRole("button")).not.toBeInTheDocument();
            expect(within(planCard).queryByText(BILLING_COPY.CURRENT_PLAN)).not.toBeInTheDocument();
        }
        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toBeDisabled();
    });

    it("shows the Free plan as current and lists both plans' features", async () => {
        await renderFreeBilling();

        expect(within(screen.getByRole("region", {name: "Free plan"})).getByRole("button", {name: BILLING_COPY.CURRENT_PLAN})).toBeDisabled();
        for (const plan of BILLING_PLANS) {
            for (const feature of plan.features) expect(screen.getByText(feature)).toBeInTheDocument();
        }
        expect(screen.queryByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION})).not.toBeInTheDocument();
    });

    it("shows the Pro plan as current with management after loading a Pro subscription", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL}),
        });
        renderBilling();

        await screen.findByRole("region", {name: "Pro plan"});
        expect(within(proPlan()).getByRole("button", {name: BILLING_COPY.CURRENT_PLAN})).toBeDisabled();
        expect(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION})).toBeInTheDocument();
    });

    it("shows an error with retry when loading the subscription fails", async () => {
        const user = userEvent.setup();
        let calls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                calls += 1;
                return calls === 1 ? new Response(null, {status: 500}) : Response.json(FREE_SUBSCRIPTION);
            },
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => Response.json({url: CHECKOUT_URL}),
        });
        renderBilling();

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.SUBSCRIPTION_LOAD_ERROR);

        await user.click(screen.getByRole("button", {name: BILLING_COPY.RETRY}));

        await screen.findByRole("region", {name: "Free plan"});
        expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, expect.anything());
    });

    it("starts with monthly pricing", async () => {
        await renderFreeBilling();

        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toHaveAttribute("aria-pressed", "true");
        expect(within(proPlan()).getByRole("status", {name: BILLING_PRICES.monthly.monthlyPrice})).toBeInTheDocument();
        expect(within(proPlan()).getByText(BILLING_PRICES.monthly.description)).toBeInTheDocument();
    });

    it("shows the yearly total and leaves Free pricing unchanged", async () => {
        const user = await renderFreeBilling();

        await user.click(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`}));

        expect(within(proPlan()).getByRole("status", {name: BILLING_PRICES.yearly.monthlyPrice})).toBeInTheDocument();
        expect(within(proPlan()).getByText(BILLING_PRICES.yearly.description)).toBeInTheDocument();
        expect(screen.getByRole("status", {name: BILLING_COPY.FREE_PRICE})).toBeInTheDocument();
        expect(screen.getByText(BILLING_COPY.FREE_DESCRIPTION)).toBeInTheDocument();
    });
});

describe.each([
    {layout: "desktop", stubViewport: stubDesktopViewport},
    {layout: "mobile", stubViewport: stubMobileViewport},
])("BillingSettings $layout checkout", ({stubViewport}) => {
    beforeEach(() => {
        stubViewport();
        mockBillingRedirect();
    });

    it.each(BILLING_CYCLES)("redirects to checkout with %s billing", async (cycle) => {
        const user = await renderFreeBilling();
        if (cycle === "yearly") await user.click(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`}));

        await clickUpgrade(user);

        await waitFor(() => expect(redirectedUrls()).toEqual([CHECKOUT_URL]));
        const [request] = getRequestsTo(API_ENDPOINTS.BILLING_CHECKOUT, "POST");
        expect(parseRequestBody(request)).toEqual({billingPeriod: cycle === "monthly" ? "MONTHLY" : "YEARLY"});
    });

    it("prevents duplicate checkouts while redirecting", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(FREE_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => new Promise<Response>(() => {}),
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Free plan"});

        await clickUpgrade(user);
        await user.click(screen.getByRole("button", {name: BILLING_COPY.UPGRADING}));

        expect(screen.getByRole("button", {name: BILLING_COPY.UPGRADING})).toBeDisabled();
        expect(getRequestsTo(API_ENDPOINTS.BILLING_CHECKOUT, "POST")).toHaveLength(1);
        expect(redirectedUrls()).toHaveLength(0);
    });

    it("shows already-Pro and refreshes the subscription on a 409 conflict", async () => {
        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(subscriptionCalls === 1 ? FREE_SUBSCRIPTION : PRO_SUBSCRIPTION);
            },
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => new Response(null, {status: 409}),
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Free plan"});

        await clickUpgrade(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.ALREADY_PRO);
        expect(redirectedUrls()).toHaveLength(0);
        await waitFor(() => expect(subscriptionCalls).toBeGreaterThan(1));
    });

    it("shows the retry delay when checkout is rate limited", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(FREE_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => new Response(JSON.stringify({detail: "Request rate limit exceeded."}), {
                status: 429,
                headers: {[RATE_LIMIT_RETRY_AFTER_HEADER]: "30"},
            }),
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Free plan"});

        await clickUpgrade(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.CHECKOUT_RATE_LIMITED);
        expect(await screen.findByRole("alert")).toHaveTextContent("30s");
        expect(redirectedUrls()).toHaveLength(0);
    });

    it("shows an invalid-period error on a 400 checkout response", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(FREE_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => new Response(null, {status: 400}),
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Free plan"});

        await clickUpgrade(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.CHECKOUT_INVALID_PERIOD);
        expect(redirectedUrls()).toHaveLength(0);
    });

    it("shows a generic error on a 500 checkout response", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(FREE_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => new Response(null, {status: 500}),
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Free plan"});

        await clickUpgrade(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.CHECKOUT_FAILED);
        expect(redirectedUrls()).toHaveLength(0);
    });

    it("lets the user retry a failed upgrade", async () => {
        let checkoutCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(FREE_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_CHECKOUT]: () => {
                checkoutCalls += 1;
                return checkoutCalls === 1 ? new Response(null, {status: 500}) : Response.json({url: CHECKOUT_URL});
            },
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Free plan"});

        await clickUpgrade(user);
        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.CHECKOUT_FAILED);
        expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.UPGRADE_LOG_ERROR, expect.anything());

        await clickUpgrade(user);

        await waitFor(() => expect(redirectedUrls()).toEqual([CHECKOUT_URL]));
    });
});

async function renderProWithYearlySelected(): Promise<ReturnType<typeof userEvent.setup>> {
    const user = renderBilling();
    await screen.findByRole("region", {name: "Pro plan"});
    await user.click(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`}));
    return user;
}

function switchToYearlyButton(): HTMLElement {
    return within(proPlan()).getByRole("button", {name: BILLING_COPY.SWITCH_TO_YEARLY});
}

async function confirmPeriodSwitch(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(await screen.findByRole("button", {name: BILLING_COPY.SWITCH_CONFIRM_BUTTON}));
}

interface PortalReturnBillingResponses {
    handleSubscriptionResponse: () => Response;
}

function mockPortalReturnBilling(effectiveDate: string | null = FUTURE_PERIOD_END): PortalReturnBillingResponses {
    const responses: PortalReturnBillingResponses = {handleSubscriptionResponse: () => Response.json(PRO_SUBSCRIPTION)};
    routeFetchWithAuth({
        [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => responses.handleSubscriptionResponse(),
        [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({
            status: "scheduled", ...(effectiveDate === null ? {} : {effectiveDate}),
        }),
        [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL, expiresInSeconds: PORTAL_TTL_SECONDS}),
    });
    return responses;
}

async function scheduleSwitchAndOpenPortal(): Promise<ReturnType<typeof userEvent.setup>> {
    const user = await renderProWithYearlySelected();
    await user.click(switchToYearlyButton());
    await confirmPeriodSwitch(user);
    await screen.findByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON)
        || content === BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL);
    const closingDrawer = screen.queryByRole("dialog", {name: BILLING_COPY.SWITCH_CONFIRM_TITLE});
    if (closingDrawer) {
        // jsdom does not run the drawer's CSS animation or populate AnimationEvent fields.
        const animationEnd = createEvent.animationEnd(closingDrawer);
        Object.defineProperty(animationEnd, "animationName", {value: window.getComputedStyle(closingDrawer).animationName});
        fireEvent(closingDrawer, animationEnd);
    }
    await user.click(await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));
    await waitFor(() => expect(portalOpenedUrls()).toEqual([PORTAL_URL]));
    return user;
}

describe.each([
    {layout: "desktop", stubViewport: stubDesktopViewport},
    {layout: "mobile", stubViewport: stubMobileViewport},
])("BillingSettings portal return $layout", ({stubViewport}) => {
    beforeEach(() => {
        stubViewport();
        mockBillingRedirect();
    });

    it("removes a canceled yearly switch and allows scheduling it again", async () => {
        mockPortalReturnBilling();
        const user = await scheduleSwitchAndOpenPortal();

        window.dispatchEvent(new FocusEvent("focus"));

        await waitFor(() => expect(switchToYearlyButton()).toBeEnabled());
        expect(screen.queryByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON))).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toBeEnabled();
        expect(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`})).toBeEnabled();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        await screen.findByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON));
        expect(getRequestsTo(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, "POST")).toHaveLength(2);
    });

    it("retains a yearly switch still reported by the subscription refresh", async () => {
        const responses = mockPortalReturnBilling();
        await scheduleSwitchAndOpenPortal();
        responses.handleSubscriptionResponse = () => Response.json({...PRO_SUBSCRIPTION, pendingBillingPeriod: "YEARLY"});

        window.dispatchEvent(new FocusEvent("focus"));

        await screen.findByText(BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL);
        expect(screen.queryByRole("button", {name: BILLING_COPY.SWITCH_TO_YEARLY})).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toBeDisabled();
        expect(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`})).toBeDisabled();
    });

    it("keeps the scheduled switch without a visible error when the portal refresh fails", async () => {
        const responses = mockPortalReturnBilling();
        await scheduleSwitchAndOpenPortal();
        responses.handleSubscriptionResponse = () => new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR});

        window.dispatchEvent(new FocusEvent("focus"));

        await waitFor(() => expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, expect.anything()));
        expect(screen.getByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON))).toBeInTheDocument();
        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toBeDisabled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.queryByRole("status", {name: BILLING_COPY.SUBSCRIPTION_LOADING})).not.toBeInTheDocument();
    });

    it("clears a dateless optimistic yearly switch after portal cancellation", async () => {
        mockPortalReturnBilling(null);
        await scheduleSwitchAndOpenPortal();

        window.dispatchEvent(new FocusEvent("focus"));

        await waitFor(() => expect(switchToYearlyButton()).toBeEnabled());
        expect(screen.queryByText(BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL)).not.toBeInTheDocument();
    });
});

describe("BillingSettings period switch", () => {
    beforeEach(() => {
        stubDesktopViewport();
        mockBillingRedirect();
    });

    it("disables Manage while a switch to yearly billing is being scheduled", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Promise<Response>(() => undefined),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        await waitFor(() => expect(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION})).toBeDisabled());
    });

    it("disables the switch to yearly billing while the portal opens", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => new Promise<Response>(() => undefined),
        });
        const user = await renderProWithYearlySelected();

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        await waitFor(() => expect(switchToYearlyButton()).toBeDisabled());
    });

    it("enables the period switch on the Pro plan when yearly billing is selected", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled"}),
        });
        await renderProWithYearlySelected();

        expect(switchToYearlyButton()).toBeEnabled();
        expect(getRequestsTo(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, "POST")).toHaveLength(0);
    });

    it("schedules the switch without a body and replaces the renewal note with the effective date", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled", effectiveDate: FUTURE_PERIOD_END}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        const [request] = getRequestsTo(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, "POST");
        expect(request.body).toBeUndefined();
        expect(await screen.findByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON))).toBeInTheDocument();
        expect(within(proPlan()).getByRole("button", {name: BILLING_COPY.CURRENT_PLAN})).toBeDisabled();
        expect(redirectedUrls()).toHaveLength(0);
        expect(getRequestsTo(API_ENDPOINTS.BILLING_CHECKOUT, "POST")).toHaveLength(0);
    });

    it("shows a dateless switch note when the provider reports no pending date", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled"}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        expect(await screen.findByText(BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL)).toBeInTheDocument();
    });

    it("prevents duplicate switch requests while scheduling", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Promise<Response>(() => {}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);
        await user.click(screen.getByRole("button", {name: BILLING_COPY.SWITCHING_PERIOD}));

        expect(screen.getByRole("button", {name: BILLING_COPY.SWITCHING_PERIOD})).toBeDisabled();
        expect(getRequestsTo(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, "POST")).toHaveLength(1);
    });

    it("refreshes the subscription without an error on a 409 conflict", async () => {
        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(PRO_SUBSCRIPTION);
            },
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Response(null, {status: 409}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        await waitFor(() => expect(subscriptionCalls).toBeGreaterThan(1));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(switchToYearlyButton()).toBeEnabled();
    });

    it("shows a not-found error on a 404 response", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Response(null, {status: 404}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PERIOD_UPGRADE_NOT_FOUND);
        expect(getRequestsTo(API_ENDPOINTS.BILLING_CHECKOUT, "POST")).toHaveLength(0);
        expect(redirectedUrls()).toHaveLength(0);
    });

    it("shows a not-eligible error on a 422 response", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Response(null, {status: 422}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PERIOD_UPGRADE_NOT_ELIGIBLE);
        expect(getRequestsTo(API_ENDPOINTS.BILLING_CHECKOUT, "POST")).toHaveLength(0);
    });

    it("shows the retry delay when the switch is rate limited", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Response(JSON.stringify({detail: "Request rate limit exceeded."}), {
                status: 429,
                headers: {[RATE_LIMIT_RETRY_AFTER_HEADER]: "25"},
            }),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PERIOD_UPGRADE_RATE_LIMITED);
        expect(await screen.findByRole("alert")).toHaveTextContent("25s");
    });

    it("shows a generic error on a 500 response", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => new Response(null, {status: 500}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PERIOD_UPGRADE_FAILED);
        expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.PERIOD_UPGRADE_LOG_ERROR, expect.anything());
    });

    it("asks for confirmation with a manage-subscription note before switching", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled"}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());

        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_TITLE)).toBeInTheDocument();
        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_DESCRIPTION)).toBeInTheDocument();
        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_NOTE)).toBeInTheDocument();
        expect(getRequestsTo(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, "POST")).toHaveLength(0);
    });

    it("closes the confirmation without a request on cancel", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled"}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await user.click(screen.getByRole("button", {name: "Cancel"}));

        expect(screen.queryByText(BILLING_COPY.SWITCH_CONFIRM_TITLE)).not.toBeInTheDocument();
        expect(getRequestsTo(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, "POST")).toHaveLength(0);
    });

    it("disables the billing cycle switcher after scheduling", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled", effectiveDate: FUTURE_PERIOD_END}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        await screen.findByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON));
        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toBeDisabled();
        expect(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`})).toBeDisabled();
    });

    it("refreshes the subscription in the background after scheduling", async () => {        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(PRO_SUBSCRIPTION);
            },
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled", effectiveDate: FUTURE_PERIOD_END}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());
        await confirmPeriodSwitch(user);

        await waitFor(() => expect(subscriptionCalls).toBeGreaterThan(1));
        expect(await screen.findByText((content) => content.startsWith(BILLING_COPY.SWITCHES_TO_YEARLY_ON))).toBeInTheDocument();
    });
});

describe.each([
    {layout: "desktop", stubViewport: stubDesktopViewport},
    {layout: "mobile", stubViewport: stubMobileViewport},
])("BillingSettings switch confirmation $layout", ({stubViewport}) => {
    beforeEach(() => {
        stubViewport();
        mockBillingRedirect();
    });

    it("shows the switch confirmation title", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE]: () => Response.json({status: "scheduled"}),
        });
        const user = await renderProWithYearlySelected();

        await user.click(switchToYearlyButton());

        expect(screen.getByText(BILLING_COPY.SWITCH_CONFIRM_TITLE)).toBeInTheDocument();
    });
});

describe("BillingSettings server pending switch", () => {
    beforeEach(() => {
        stubDesktopViewport();
        mockBillingRedirect();
    });

    function expectedPeriodEnd(): string {
        return new Date(FUTURE_PERIOD_END).toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
    }

    it("shows the server-reported switch date and hides the switch button", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json({
                ...PRO_SUBSCRIPTION,
                pendingBillingPeriod: "YEARLY",
                pendingAppliesAt: FUTURE_PERIOD_END,
            }),
        });
        const user = renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});
        await user.click(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`}));

        expect(screen.getByText(`${BILLING_COPY.SWITCHES_TO_YEARLY_ON} ${expectedPeriodEnd()}`)).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: BILLING_COPY.SWITCH_TO_YEARLY})).not.toBeInTheDocument();
        expect(within(proPlan()).getByRole("button", {name: BILLING_COPY.CURRENT_PLAN})).toBeDisabled();
    });

    it("shows a dateless switch note when the server reports no pending date", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json({...PRO_SUBSCRIPTION, pendingBillingPeriod: "YEARLY"}),
        });
        renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});

        expect(screen.getByText(BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL)).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: BILLING_COPY.SWITCH_TO_YEARLY})).not.toBeInTheDocument();
    });

    it("ignores a non-yearly pending period", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json({
                ...PRO_SUBSCRIPTION,
                pendingBillingPeriod: "MONTHLY",
                pendingAppliesAt: FUTURE_PERIOD_END,
            }),
        });
        renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});

        expect(screen.getByText(`${BILLING_COPY.RENEWS_ON} ${expectedPeriodEnd()}`)).toBeInTheDocument();
    });

    it("disables the billing cycle switcher when the server reports a pending switch", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json({
                ...PRO_SUBSCRIPTION,
                pendingBillingPeriod: "YEARLY",
                pendingAppliesAt: FUTURE_PERIOD_END,
            }),
        });
        renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});

        expect(screen.getByRole("button", {name: BILLING_COPY.MONTHLY})).toBeDisabled();
        expect(screen.getByRole("button", {name: `${BILLING_COPY.YEARLY} ${BILLING_COPY.SAVINGS}`})).toBeDisabled();
    });

    it("refreshes the subscription on return after a portal visit", async () => {
        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(PRO_SUBSCRIPTION);
            },
            [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL, expiresInSeconds: 3600}),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));
        await waitFor(() => expect(portalOpenedUrls()).toEqual([PORTAL_URL]));
        const callsAfterVisit = subscriptionCalls;

        window.dispatchEvent(new FocusEvent("focus"));

        await waitFor(() => expect(subscriptionCalls).toBeGreaterThan(callsAfterVisit));
    });

    it("skips the refresh on focus without a portal visit", async () => {
        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(PRO_SUBSCRIPTION);
            },
        });
        renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});

        window.dispatchEvent(new FocusEvent("focus"));
        await screen.findByRole("region", {name: "Pro plan"});

        expect(subscriptionCalls).toBe(1);
    });

    it("refreshes again on the next return when the first refresh failed", async () => {
        let subscriptionCalls = 0;
        let failNext = false;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return failNext ? new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}) : Response.json(PRO_SUBSCRIPTION);
            },
            [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL}),
        });
        const user = renderBilling();
        await user.click(await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));
        await waitFor(() => expect(portalOpenedUrls()).toEqual([PORTAL_URL]));
        failNext = true;
        window.dispatchEvent(new FocusEvent("focus"));
        await waitFor(() => expect(subscriptionCalls).toBe(2));

        failNext = false;
        window.dispatchEvent(new FocusEvent("focus"));
        await waitFor(() => expect(subscriptionCalls).toBe(3));

        window.dispatchEvent(new FocusEvent("focus"));
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(subscriptionCalls).toBe(3);
    });

    it("refreshes when the tab becomes visible again, without a focus event", async () => {
        markPortalOpened();
        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(PRO_SUBSCRIPTION);
            },
        });
        renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});

        document.dispatchEvent(new Event("visibilitychange"));

        await waitFor(() => expect(subscriptionCalls).toBe(2));
    });

    it("leaves the refresh to the tab that opened the portal", async () => {
        localStorage.setItem("urlshortener:billing:portal-return", JSON.stringify({openedAtMs: Date.now()}));
        let subscriptionCalls = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => {
                subscriptionCalls += 1;
                return Response.json(PRO_SUBSCRIPTION);
            },
        });
        renderBilling();
        await screen.findByRole("region", {name: "Pro plan"});

        window.dispatchEvent(new FocusEvent("focus"));
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(subscriptionCalls).toBe(1);
        localStorage.clear();
    });
});

describe("BillingSettings portal", () => {
    beforeEach(() => {
        stubDesktopViewport();
        mockBillingRedirect();
    });

    it("opens the portal in a new tab from the Manage button for Pro subscribers", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL}),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        await waitFor(() => expect(portalOpenedUrls()).toEqual([PORTAL_URL]));
        expect(redirectedUrls()).toHaveLength(0);
        expect(fetchWithAuth).toHaveBeenCalledWith(API_ENDPOINTS.BILLING_PORTAL, expect.objectContaining({method: "POST"}));
    });

    it("shows an external link icon on the Manage button", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL}),
        });
        renderBilling();
        const manageButton = await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        expect(manageButton.querySelector("svg")).not.toBeNull();
        expect(within(manageButton).queryByRole("status")).not.toBeInTheDocument();
    });

    it("returns the Manage button to idle after the portal opens", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => Response.json({url: PORTAL_URL}),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        await waitFor(() => expect(portalOpenedUrls()).toEqual([PORTAL_URL]));
        const manageButton = await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});
        expect(manageButton).toBeEnabled();
    });

    it("prevents duplicate portal requests while opening", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => new Promise<Response>(() => {}),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));
        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGING_SUBSCRIPTION}));

        expect(getRequestsTo(API_ENDPOINTS.BILLING_PORTAL, "POST")).toHaveLength(1);
    });

    it("offers checkout when the portal reports no billing history", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => new Response(null, {status: 404}),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PORTAL_NO_HISTORY);
    });

    it("shows the retry delay when the portal is rate limited", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => new Response(JSON.stringify({detail: "Request rate limit exceeded."}), {
                status: 429,
                headers: {[RATE_LIMIT_RETRY_AFTER_HEADER]: "15"},
            }),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PORTAL_RATE_LIMITED);
    });

    it("shows a generic error when the portal fails", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
            [API_ENDPOINTS.BILLING_PORTAL]: () => new Response(null, {status: 500}),
        });
        const user = renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        await user.click(screen.getByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION}));

        expect(await screen.findByRole("alert")).toHaveTextContent(BILLING_COPY.PORTAL_FAILED);
    });
});

describe("BillingSettings period note", () => {
    beforeEach(() => {
        stubDesktopViewport();
        mockBillingRedirect();
    });

    function expectedPeriodEnd(): string {
        return new Date(FUTURE_PERIOD_END).toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
    }

    it("shows the renewal date for an active subscription", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json(PRO_SUBSCRIPTION),
        });
        renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        expect(screen.getByText(`${BILLING_COPY.RENEWS_ON} ${expectedPeriodEnd()}`)).toBeInTheDocument();
    });

    it("shows the cancelation date when the subscription cancels at period end", async () => {
        routeFetchWithAuth({
            [API_ENDPOINTS.BILLING_SUBSCRIPTION]: () => Response.json({...PRO_SUBSCRIPTION, cancelAtPeriodEnd: true}),
        });
        renderBilling();
        await screen.findByRole("button", {name: BILLING_COPY.MANAGE_SUBSCRIPTION});

        expect(screen.getByText(`${BILLING_COPY.CANCELS_ON} ${expectedPeriodEnd()}`)).toBeInTheDocument();
    });
});
