import {queryOptions} from "@tanstack/react-query";
import {getBillingSubscription, isUnauthorizedBillingError} from "@/lib/billing-api";
import {BILLING_COPY, type BillingSubscription} from "@/lib/billing-constants";
import {logger} from "@/lib/logger";
import {queryKeys} from "@/lib/query/query-keys";

async function loadSubscription(signal: AbortSignal): Promise<BillingSubscription> {
    try {
        return await getBillingSubscription(signal);
    } catch (error) {
        if (!signal.aborted && !isUnauthorizedBillingError(error)) logger.error(BILLING_COPY.SUBSCRIPTION_LOG_ERROR, error);
        throw error;
    }
}

/**
 * The plan changes outside this app (hosted checkout, the billing portal in another tab), so the subscription is always
 * stale: it reloads whenever the billing page mounts or its tab becomes visible again, which is how a portal change
 * shows up on return.
 */
export const billingSubscriptionQueryOptions = queryOptions({
    queryKey: queryKeys.billing.subscription,
    queryFn: ({signal}) => loadSubscription(signal),
    staleTime: 0,
    refetchOnWindowFocus: true,
});
