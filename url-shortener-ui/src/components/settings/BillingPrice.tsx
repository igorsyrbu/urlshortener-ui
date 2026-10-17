"use client";

import {useState} from "react";
import {cn} from "@/lib/utils";
import {BILLING_COPY} from "@/lib/billing-constants";

interface BillingPriceProps {
    price: string;
}

const AMOUNT_SLOT_CLASS = "pointer-events-none col-start-1 row-start-1 duration-200 ease-in-out";
const AMOUNT_ENTER_CLASS = "animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none";
const AMOUNT_LEAVE_CLASS = "animate-out fade-out slide-out-to-top-1 fill-mode-forwards motion-reduce:hidden";

export function BillingPrice({price}: BillingPriceProps) {
    const amount = price.slice(BILLING_COPY.CURRENCY_SYMBOL.length);
    const [shownAmount, setShownAmount] = useState(amount);
    const [leavingAmount, setLeavingAmount] = useState<string | null>(null);
    const [hasChanged, setHasChanged] = useState(false);
    if (amount !== shownAmount) {
        setLeavingAmount(shownAmount);
        setShownAmount(amount);
        setHasChanged(true);
    }

    return (
        <div role="status" aria-label={price} aria-live="polite" aria-atomic="true"
             className="flex flex-wrap items-baseline gap-2">
            <span className="sr-only">{price} {BILLING_COPY.PRICE_PERIOD}</span>
            <span aria-hidden="true" className="inline-flex items-baseline text-4xl font-semibold tracking-tight tabular-nums">
                <span>{BILLING_COPY.CURRENCY_SYMBOL}</span>
                <span className="relative inline-grid overflow-hidden">
                    {leavingAmount !== null && (
                        <span key={`leaving-${leavingAmount}`}
                              className={cn(AMOUNT_SLOT_CLASS, AMOUNT_LEAVE_CLASS)}
                              onAnimationEnd={() => setLeavingAmount(null)}>
                            {leavingAmount}
                        </span>
                    )}
                    <span key={shownAmount} className={cn(AMOUNT_SLOT_CLASS, hasChanged && AMOUNT_ENTER_CLASS)}>
                        {shownAmount}
                    </span>
                </span>
            </span>
            <span aria-hidden="true" className="text-sm text-muted-foreground">{BILLING_COPY.PRICE_PERIOD}</span>
        </div>
    );
}
