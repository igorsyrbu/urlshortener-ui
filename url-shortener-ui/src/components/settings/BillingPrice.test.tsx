import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {BillingPrice} from "@/components/settings/BillingPrice";
import {BILLING_COPY, BILLING_PRICES} from "@/lib/billing-constants";
import {fireAnimationEnd} from "@/test/animation-utils";

function amountOf(price: string): string {
    return price.slice(BILLING_COPY.CURRENCY_SYMBOL.length);
}

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

    it("shows the new amount at once and lets the old one slide out", () => {
        const {rerender} = render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        rerender(<BillingPrice price={BILLING_PRICES.yearly.monthlyPrice}/>);

        expect(screen.getByText(amountOf(BILLING_PRICES.yearly.monthlyPrice), {exact: true})).not.toHaveClass("animate-out");
        expect(screen.getByText(amountOf(BILLING_PRICES.monthly.monthlyPrice), {exact: true})).toHaveClass("animate-out");
    });

    it("removes the old amount once its exit animation ends", () => {
        const {rerender} = render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);
        rerender(<BillingPrice price={BILLING_PRICES.yearly.monthlyPrice}/>);

        fireAnimationEnd(screen.getByText(amountOf(BILLING_PRICES.monthly.monthlyPrice), {exact: true}));

        expect(screen.queryByText(amountOf(BILLING_PRICES.monthly.monthlyPrice), {exact: true})).not.toBeInTheDocument();
        expect(screen.getByText(amountOf(BILLING_PRICES.yearly.monthlyPrice), {exact: true})).toBeInTheDocument();
    });

    it("does not animate the first price", () => {
        render(<BillingPrice price={BILLING_PRICES.monthly.monthlyPrice}/>);

        expect(screen.getByText(amountOf(BILLING_PRICES.monthly.monthlyPrice), {exact: true})).not.toHaveClass("animate-in");
    });
});
