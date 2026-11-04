"use client";

import {useQuery, useQueryClient} from "@tanstack/react-query";
import {BillingApiError, isUnauthorizedBillingError, readRateLimitDelay} from "@/lib/billing-api";
import {HTTP_TOO_MANY_REQUESTS} from "@/lib/http-status";
import {
    BILLING_COPY,
    buildRateLimitedMessage,
    FREE_BILLING_SUBSCRIPTION,
    type BillingSubscription,
    type ScheduledPeriodSwitch,
} from "@/lib/billing-constants";
import {useCooldown} from "@/lib/hooks/useCooldown";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";
import {billingSubscriptionQueryOptions} from "@/lib/query/billing-queries";
import {refreshAfter} from "@/lib/query/invalidation";

export interface BillingSubscriptionState {
    /** The Free plan until the first answer, so the plans can render behind the loading card. */
    subscription: BillingSubscription;
    isLoading: boolean;
    errorMessage: string | null;
    /** True while a rate limit's delay runs; Retry waits for it. */
    isRetryCoolingDown: boolean;
    handleRetry: () => void;
    /** Reloads in the background after an action learned that the plan changed elsewhere (a 409). */
    refreshSubscription: () => void;
    /** Shows a switch the server has just scheduled, until the next reload reports it (or its cancelation). */
    showScheduledSwitch: (scheduledSwitch: ScheduledPeriodSwitch) => void;
}

function resolveLoadErrorMessage(error: Error): string {
    const isRateLimited = error instanceof BillingApiError && error.status === HTTP_TOO_MANY_REQUESTS;
    return isRateLimited ? buildRateLimitedMessage(BILLING_COPY.SUBSCRIPTION_RATE_LIMITED, error.retryAfterSeconds) : BILLING_COPY.SUBSCRIPTION_LOAD_ERROR;
}

export function useBillingSubscription(): BillingSubscriptionState {
    const queryClient = useQueryClient();
    const {data, error, isFetching, refetch} = useQuery(billingSubscriptionQueryOptions);
    const {isCoolingDown: isRetryCoolingDown, startCooldown} = useCooldown();
    // A failed reload keeps the subscription on screen; only a failure with nothing to show is reported. A 401 is not
    // reported either: the page is about to go to sign in, so it keeps loading instead of flashing an error.
    const loadFailure = data === undefined && !isFetching && !isUnauthorizedBillingError(error) ? error : null;
    useOnValueChange(loadFailure, (failure) => {
        if (failure) startCooldown(readRateLimitDelay(failure));
    });

    return {
        subscription: data ?? FREE_BILLING_SUBSCRIPTION,
        isLoading: data === undefined && loadFailure === null,
        errorMessage: loadFailure ? resolveLoadErrorMessage(loadFailure) : null,
        isRetryCoolingDown,
        handleRetry: () => void refetch(),
        refreshSubscription: () => void refreshAfter(queryClient, "billingConflict"),
        showScheduledSwitch: (scheduledSwitch) => queryClient.setQueryData<BillingSubscription>(
            billingSubscriptionQueryOptions.queryKey,
            (current) => current && {...current, pendingSwitch: scheduledSwitch},
        ),
    };
}
