"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {getBillingSubscription} from "@/lib/billing-api";
import {BILLING_COPY, FREE_BILLING_SUBSCRIPTION, type BillingSubscription} from "@/lib/billing-constants";
import {logger} from "@/lib/logger";

export interface BillingSubscriptionState {
    subscription: BillingSubscription;
    isLoading: boolean;
    errorMessage: string | null;
    handleRetry: () => void;
    refreshSilently: () => Promise<boolean>;
}

export function useBillingSubscription(): BillingSubscriptionState {
    const [subscription, setSubscription] = useState<BillingSubscription>(FREE_BILLING_SUBSCRIPTION);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleRetry = useCallback(() => {
        setRetryCount((count) => count + 1);
    }, []);

    const refreshSilently = useCallback(async (): Promise<boolean> => {
        try {
            const next = await getBillingSubscription();
            if (!isMountedRef.current) return false;
            setSubscription(next);
            return true;
        } catch (error) {
            logger.error(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, error);
            return false;
        }
    }, []);

    useEffect(() => {
        let isCancelled = false;

        async function loadSubscription(): Promise<void> {
            setIsLoading(true);
            setErrorMessage(null);
            try {
                const next = await getBillingSubscription();
                if (isCancelled) return;
                setSubscription(next);
            } catch (error) {
                if (isCancelled) return;
                logger.error(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, error);
                setErrorMessage(BILLING_COPY.SUBSCRIPTION_LOAD_ERROR);
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        }

        void loadSubscription();
        return () => {
            isCancelled = true;
        };
    }, [retryCount]);

    return {subscription, isLoading, errorMessage, handleRetry, refreshSilently};
}
