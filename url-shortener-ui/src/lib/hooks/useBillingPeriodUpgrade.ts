"use client";

import {useCallback, useState} from "react";
import {
    BillingApiError,
    HTTP_CONFLICT,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    HTTP_UNPROCESSABLE_ENTITY,
    scheduleBillingPeriodUpgrade,
} from "@/lib/billing-api";
import {BILLING_COPY, buildRateLimitedMessage, type ScheduledPeriodSwitch} from "@/lib/billing-constants";
import {logger} from "@/lib/logger";

export interface BillingPeriodUpgradeState {
    isScheduling: boolean;
    errorMessage: string | null;
    scheduledSwitch: ScheduledPeriodSwitch | null;
    clearScheduledSwitch: () => void;
    handleSwitch: () => Promise<void>;
}

function resolvePeriodUpgradeErrorMessage(error: unknown): string {
    if (!(error instanceof BillingApiError)) return BILLING_COPY.PERIOD_UPGRADE_FAILED;
    if (error.status === HTTP_NOT_FOUND) return BILLING_COPY.PERIOD_UPGRADE_NOT_FOUND;
    if (error.status === HTTP_UNPROCESSABLE_ENTITY) return BILLING_COPY.PERIOD_UPGRADE_NOT_ELIGIBLE;
    if (error.status === HTTP_TOO_MANY_REQUESTS) {
        return buildRateLimitedMessage(BILLING_COPY.PERIOD_UPGRADE_RATE_LIMITED, error.retryAfterSeconds);
    }
    return BILLING_COPY.PERIOD_UPGRADE_FAILED;
}

export function useBillingPeriodUpgrade(onConflict: () => void, onScheduled?: () => void): BillingPeriodUpgradeState {
    const [isScheduling, setIsScheduling] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [scheduledSwitch, setScheduledSwitch] = useState<ScheduledPeriodSwitch | null>(null);
    const clearScheduledSwitch = useCallback((): void => {
        setScheduledSwitch(null);
    }, []);

    async function handleSwitch(): Promise<void> {
        if (isScheduling || scheduledSwitch !== null) return;
        setIsScheduling(true);
        setErrorMessage(null);
        try {
            const response = await scheduleBillingPeriodUpgrade();
            setScheduledSwitch({effectiveDate: response.effectiveDate ?? null});
            setIsScheduling(false);
            onScheduled?.();
        } catch (error) {
            logger.error(BILLING_COPY.PERIOD_UPGRADE_LOG_ERROR, error);
            if (error instanceof BillingApiError && error.status === HTTP_CONFLICT) {
                onConflict();
                setIsScheduling(false);
                return;
            }
            setErrorMessage(resolvePeriodUpgradeErrorMessage(error));
            setIsScheduling(false);
        }
    }

    return {isScheduling, errorMessage, scheduledSwitch, clearScheduledSwitch, handleSwitch};
}
