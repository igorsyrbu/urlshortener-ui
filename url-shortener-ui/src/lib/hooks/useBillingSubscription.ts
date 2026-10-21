"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {BillingApiError, getBillingSubscription, HTTP_TOO_MANY_REQUESTS, isUnauthorizedBillingError, readRateLimitDelay} from "@/lib/billing-api";
import {BILLING_COPY, buildRateLimitedMessage, FREE_BILLING_SUBSCRIPTION, type BillingSubscription} from "@/lib/billing-constants";
import {useCooldown} from "@/lib/hooks/useCooldown";
import {logger} from "@/lib/logger";

export interface BillingSubscriptionState {
    subscription: BillingSubscription;
    isLoading: boolean;
    errorMessage: string | null;
    /** True while a rate limit's delay runs; Retry waits for it. */
    isRetryCoolingDown: boolean;
    handleRetry: () => void;
    refreshSilently: () => Promise<boolean>;
}

type SubscriptionResult =
    | {isSuccess: true; subscription: BillingSubscription}
    | {isSuccess: false; error: unknown};

function resolveLoadErrorMessage(error: unknown): string {
    const isRateLimited = error instanceof BillingApiError && error.status === HTTP_TOO_MANY_REQUESTS;
    return isRateLimited ? buildRateLimitedMessage(BILLING_COPY.SUBSCRIPTION_RATE_LIMITED, error.retryAfterSeconds) : BILLING_COPY.SUBSCRIPTION_LOAD_ERROR;
}

async function fetchSubscriptionResult(): Promise<SubscriptionResult> {
    try {
        return {isSuccess: true, subscription: await getBillingSubscription()};
    } catch (error) {
        return {isSuccess: false, error};
    }
}

export function useBillingSubscription(): BillingSubscriptionState {
    const [subscription, setSubscription] = useState<BillingSubscription>(FREE_BILLING_SUBSCRIPTION);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const {isCoolingDown: isRetryCoolingDown, startCooldown} = useCooldown();
    // Every load and refresh takes the next id; only the newest may write state, so an older response that
    // arrives late cannot overwrite a newer one. Unmount bumps the id to discard everything still in flight.
    const latestRequestIdRef = useRef(0);
    // A visible load (skeleton or error) is waiting; whichever request finishes last must end it.
    const isVisibleLoadPendingRef = useRef(false);

    useEffect(() => () => {
        latestRequestIdRef.current += 1;
    }, []);

    const applyLatestResult = useCallback((result: SubscriptionResult): void => {
        // On a 401 the page is about to go to sign in: keep the loading state instead of flashing an error.
        if (!result.isSuccess && isUnauthorizedBillingError(result.error)) return;
        if (result.isSuccess) setSubscription(result.subscription);
        else logger.error(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, result.error);
        if (!isVisibleLoadPendingRef.current) return;
        isVisibleLoadPendingRef.current = false;
        setIsLoading(false);
        if (result.isSuccess) return;
        setErrorMessage(resolveLoadErrorMessage(result.error));
        startCooldown(readRateLimitDelay(result.error));
    }, [startCooldown]);

    const requestLatest = useCallback(async (): Promise<SubscriptionResult | null> => {
        latestRequestIdRef.current += 1;
        const requestId = latestRequestIdRef.current;
        const result = await fetchSubscriptionResult();
        if (requestId !== latestRequestIdRef.current) return null;
        applyLatestResult(result);
        return result;
    }, [applyLatestResult]);

    const handleRetry = useCallback(() => {
        setRetryCount((count) => count + 1);
    }, []);

    const refreshSilently = useCallback(async (): Promise<boolean> => {
        const result = await requestLatest();
        return result?.isSuccess === true;
    }, [requestLatest]);

    useEffect(() => {
        async function loadSubscription(): Promise<void> {
            isVisibleLoadPendingRef.current = true;
            setIsLoading(true);
            setErrorMessage(null);
            await requestLatest();
        }

        void loadSubscription();
    }, [retryCount, requestLatest]);

    return {subscription, isLoading, errorMessage, isRetryCoolingDown, handleRetry, refreshSilently};
}
