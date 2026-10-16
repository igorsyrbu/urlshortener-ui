import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {BillingPrice} from "@/components/settings/BillingPrice";
import {BILLING_COPY, BILLING_PRICES} from "@/lib/billing-constants";

describe("BillingPrice", () => {
    it("announces the current monthly price with its billing period", () => {
        render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        expect(screen.getByRole("status", {name: BILLING_PRICES.monthly.monthlyPrice})).toHaveTextContent(BILLING_COPY.PRICE_PERIOD);
    });

    it("announces the new price immediately when the billing cycle changes", () => {
        const {rerender} = render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        rerender(<BillingPrice price={BILLING_PRICES.yearly.monthlyPrice}/>);

        expect(screen.getByRole("status", {name: BILLING_PRICES.yearly.monthlyPrice})).toBeInTheDocument();
        expect(screen.queryByRole("status", {name: BILLING_PRICES.monthly.monthlyPrice})).not.toBeInTheDocument();
    });

    it("announces only the latest price when the cycle changes rapidly", () => {
        const {rerender} = render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        rerender(<BillingPrice price={BILLING_PRICES.yearly.monthlyPrice}/>);
        rerender(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        expect(screen.getByRole("status", {name: BILLING_PRICES.monthly.monthlyPrice})).toBeInTheDocument();
        expect(screen.queryByRole("status", {name: BILLING_PRICES.yearly.monthlyPrice})).not.toBeInTheDocument();
    });

    it("keeps one dollar sign visible while the numeric price changes", () => {
        const {rerender} = render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        rerender(<BillingPrice price={BILLING_PRICES.yearly.monthlyPrice}/>);

        expect(screen.getAllByText(BILLING_COPY.CURRENCY_SYMBOL, {exact: true})).toHaveLength(1);
        expect(screen.getByText(BILLING_COPY.CURRENCY_SYMBOL, {exact: true})).toBeVisible();
        expect(screen.getByRole("status", {name: BILLING_PRICES.yearly.monthlyPrice})).toBeInTheDocument();
    });
});
