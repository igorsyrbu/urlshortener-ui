"use client";

import {AnimatePresence, motion, useReducedMotion, type Transition} from "framer-motion";
import {BILLING_COPY} from "@/lib/billing-constants";

interface BillingPriceProps {
    price: string;
}

const PRICE_TRANSITION: Transition = {duration: 0.2, ease: "easeInOut"};
const REDUCED_MOTION_TRANSITION: Transition = {duration: 0};

export function BillingPrice({price}: BillingPriceProps) {
    const hasReducedMotion = useReducedMotion() ?? false;
    const amount = price.slice(BILLING_COPY.CURRENCY_SYMBOL.length);
    return (
        <div role="status" aria-label={price} aria-live="polite" aria-atomic="true"
             className="flex flex-wrap items-baseline gap-2">
            <span className="sr-only">{price} {BILLING_COPY.PRICE_PERIOD}</span>
            <span aria-hidden="true" className="inline-flex items-baseline text-4xl font-semibold tracking-tight tabular-nums">
                <span>{BILLING_COPY.CURRENCY_SYMBOL}</span>
                <span className="relative inline-grid overflow-hidden">
                    <AnimatePresence initial={false} mode="popLayout">
                        <motion.span key={amount} aria-hidden="true" className="pointer-events-none col-start-1 row-start-1"
                                     initial={hasReducedMotion ? false : {opacity: 0, y: "var(--spacing)"}}
                                     animate={{opacity: 1, y: 0}}
                                     exit={{opacity: hasReducedMotion ? 1 : 0, y: hasReducedMotion ? 0 : "calc(var(--spacing) * -1)"}}
                                     transition={hasReducedMotion ? REDUCED_MOTION_TRANSITION : PRICE_TRANSITION}>
                            {amount}
                        </motion.span>
                    </AnimatePresence>
                </span>
            </span>
            <span aria-hidden="true" className="text-sm text-muted-foreground">{BILLING_COPY.PRICE_PERIOD}</span>
        </div>
    );
}
