"use client";

import {useEffect, useState} from "react";
import {
    BillingApiError,
    HTTP_BAD_REQUEST,
    HTTP_CONFLICT,
    HTTP_TOO_MANY_REQUESTS,
    createBillingCheckoutUrl,
} from "@/lib/billing-api";
import {
    BILLING_COPY,
    buildRateLimitedMessage,
    type BillingCycle,
} from "@/lib/billing-constants";
import {logger} from "@/lib/logger";
import {redirectToBillingUrl} from "@/lib/billing-redirect";

export interface BillingCheckoutState {
    isRedirecting: boolean;
    errorMessage: string | null;
    handleUpgrade: () => Promise<void>;
}

function resolveCheckoutErrorMessage(error: unknown): string {
    if (!(error instanceof BillingApiError)) return BILLING_COPY.CHECKOUT_FAILED;
    if (error.status === HTTP_CONFLICT) return BILLING_COPY.ALREADY_PRO;
    if (error.status === HTTP_BAD_REQUEST) return BILLING_COPY.CHECKOUT_INVALID_PERIOD;
    if (error.status === HTTP_TOO_MANY_REQUESTS) {
        return buildRateLimitedMessage(BILLING_COPY.CHECKOUT_RATE_LIMITED, error.retryAfterSeconds);
    }
    return BILLING_COPY.CHECKOUT_FAILED;
}

export function useBillingCheckout(cycle: BillingCycle, onAlreadyPro: () => void): BillingCheckoutState {
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Back from the hosted checkout can restore this page from the back/forward cache with the button frozen
        // in "Redirecting…", because a successful redirect never resets it.
        function handlePageShow(event: PageTransitionEvent): void {
            if (event.persisted) setIsRedirecting(false);
        }

        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    async function handleUpgrade(): Promise<void> {
        if (isRedirecting) return;
        setIsRedirecting(true);
        setErrorMessage(null);
        try {
            redirectToBillingUrl(await createBillingCheckoutUrl(cycle));
        } catch (error) {
            logger.error(BILLING_COPY.UPGRADE_LOG_ERROR, error);
            if (error instanceof BillingApiError && error.status === HTTP_CONFLICT) onAlreadyPro();
            setErrorMessage(resolveCheckoutErrorMessage(error));
            setIsRedirecting(false);
        }
    }

    return {isRedirecting, errorMessage, handleUpgrade};
}
